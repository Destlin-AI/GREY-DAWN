#!/usr/bin/env python3
import os
import sys
import json
import time
import torch
import numpy as np
import psutil
import logging
import threading
import queue
import mmap
import asyncio
import uvicorn
import concurrent.futures
import subprocess
import hashlib
import zstandard as zstd
from typing import Dict, List, Optional, Tuple, Any, Union, Callable
from pathlib import Path

from fastapi import FastAPI, HTTPException, BackgroundTasks, Request, Security, Depends
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field
import requests
import httpx
import io
import shutil
import gc
from fastapi.responses import JSONResponse

# Hugging Face Transformers imports
from transformers import AutoConfig, AutoModelForCausalLM, AutoTokenizer, PreTrainedModel, PreTrainedTokenizerBase
from huggingface_hub import snapshot_download, HfApi

# Global Configuration & Constants
CONFIG_FILE_PATH = "tensor_config.json"
DEFAULT_MODEL_CACHE_DIR = "huggingface_models_cache"
DEFAULT_SERVER_LOG_FILE = "ultra_tensor_server.log"
MIN_NVME_STRIPE_SIZE_MB = 16
MIN_RAMDISK_SIZE_MB = 256

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(name)s | %(threadName)s | %(module)s.%(funcName)s:%(lineno)d | %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("UltraTensorServer")

# Global State Variables
config: Dict[str, Any] = {}
hardware_summary: Dict[str, Any] = {
    "gpu": {"available": False, "count": 0, "devices": []},
    "cpu": {},
    "ram": {},
    "nvme": {"available": False, "path": None},
    "ramdisk": {"available": False, "path": None},
    "log_file_path": None
}

# Global Registries and Caches
layer_metadata_registry: Dict[int, 'LayerMetadata'] = {}
layer_cache: Dict[int, torch.Tensor] = {}
layer_access_stats: Dict[int, Dict[str, Any]] = {}
layer_locks: Dict[int, threading.Lock] = {}

# Queues for Operations
layer_transfer_queue = queue.PriorityQueue(maxsize=200)
prefetch_job_queue = queue.Queue(maxsize=100)

# Thread Pools
nvme_worker_pool: Optional[concurrent.futures.ThreadPoolExecutor] = None

# Control Events
main_stop_event = threading.Event()
server_start_time = time.monotonic()

# Core Service Managers
hardware_mgr: Optional['HardwareManager'] = None
quant_manager: Optional['QuantizationManager'] = None
compress_manager: Optional['CompressionManager'] = None
nvme_mgr: Optional['NVMEManager'] = None
ramdisk_mgr: Optional['RAMDiskManager'] = None
mem_placement_mgr: Optional['MemoryPlacementManager'] = None
model_manager_service: Optional['ModelManagerService'] = None
inference_service: Optional['InferenceService'] = None
api_key_auth_check: Optional[Callable] = None

# Pydantic Models for API
class APIBaseModel(BaseModel):
    class Config:
        from_attributes = True

class LayerInfoAPI(APIBaseModel):
    id: int
    name: str
    original_size_mb: float
    current_size_mb: float
    current_device: str
    gpu_id: Optional[int] = None
    quantization_type: Optional[str] = None
    compression_type: Optional[str] = None
    access_count: int
    last_access_timestamp: float

class TransferRequestAPI(APIBaseModel):
    layer_id: int
    destination_device: str = Field(..., description="Target device: 'cpu', 'gpu:X', 'ramdisk', 'nvme'")
    priority: int = Field(default=5, ge=1, le=10, description="Transfer priority (1=highest, 10=lowest)")

class ModelLoadAPIRequest(APIBaseModel):
    model_name_or_path: str = Field(..., description="Hugging Face model ID or local path")
    compute_device: Optional[str] = Field(default=None, description="Preferred primary compute device")
    hf_token: Optional[str] = Field(default=None, description="Hugging Face API token")

class ModelStatusAPIResponse(APIBaseModel):
    model_name: Optional[str] = None
    model_path: Optional[str] = None
    architecture: Optional[str] = None
    tokenizer_name: Optional[str] = None
    num_managed_layers: int = 0
    compute_device: Optional[str] = None
    status: str = Field(..., description="Current status")
    error_message: Optional[str] = None

class GenerateTextAPIRequest(APIBaseModel):
    prompt: str
    max_new_tokens: int = Field(default=128, gt=0, le=8192)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    top_p: float = Field(default=0.9, ge=0.0, le=1.0)
    top_k: Optional[int] = Field(default=None, ge=0)

class GenerateTextAPIResponse(APIBaseModel):
    prompt: str
    generated_text: str
    model_name: str
    tokens_generated: int
    generation_time_seconds: float

class ServerStatusAPIResponse(APIBaseModel):
    server_status: str
    uptime_seconds: float
    model_status: ModelStatusAPIResponse
    hardware_summary: Dict[str, Any]
    layer_transfer_queue_size: int
    prefetch_job_queue_size: int
    active_threads: int
    log_file_path: Optional[str] = None

# Core Data Structures
class LayerMetadata:
    def __init__(self, layer_id: int, name: str, original_size_bytes: int,
                 shape: Tuple[int, ...], dtype: torch.dtype, current_device: str,
                 gpu_id: Optional[int] = None, compression_type: Optional[str] = None,
                 quantization_type: Optional[str] = None, nvme_path: Optional[str] = None,
                 ramdisk_path: Optional[str] = None, quantization_params: Optional[Dict] = None,
                 is_on_nvme_stripped: bool = False):
        self.id = layer_id
        self.name = name
        self.original_size_bytes = original_size_bytes
        self.current_size_bytes = original_size_bytes
        self.shape = shape
        self.original_dtype = dtype
        self.current_dtype = dtype
        self.current_device = current_device
        self.gpu_id = gpu_id if current_device == "gpu" else None

        self.compression_type = compression_type
        self.quantization_type = quantization_type
        self.quantization_params = quantization_params if quantization_params else {}

        self.nvme_path: Optional[str] = nvme_path
        self.ramdisk_path: Optional[str] = ramdisk_path

        self.access_count: int = 0
        self.last_access_timestamp: float = 0.0
        self.loaded_in_memory: bool = (current_device not in ["nvme"])

        self.nvme_stripes: List[Dict[str, Any]] = []
        self.is_on_nvme_stripped: bool = is_on_nvme_stripped

        if layer_id not in layer_locks:
            layer_locks[layer_id] = threading.Lock()

    def get_lock(self) -> threading.Lock:
        return layer_locks[self.id]

    def update_access_stats(self):
        with self.get_lock():
            self.access_count += 1
            self.last_access_timestamp = time.time()
            layer_access_stats[self.id] = {
                "count": self.access_count,
                "last_access": self.last_access_timestamp,
                "name": self.name
            }

    def set_location(self, device_type_str: str, path_val: Optional[str] = None, gpu_id_val: Optional[int] = None):
        with self.get_lock():
            self.current_device = device_type_str
            self.gpu_id = gpu_id_val if device_type_str == "gpu" else None
            self.loaded_in_memory = (device_type_str not in ["nvme"])

            if device_type_str == "nvme":
                self.nvme_path = path_val
                self.ramdisk_path = None
            elif device_type_str == "ramdisk":
                self.ramdisk_path = path_val
                self.nvme_path = None
            else:
                self.nvme_path = None
                self.ramdisk_path = None

    def to_api_model(self) -> LayerInfoAPI:
        return LayerInfoAPI(
            id=self.id, name=self.name,
            original_size_mb=round(self.original_size_bytes / (1024*1024), 3),
            current_size_mb=round(self.current_size_bytes / (1024*1024), 3),
            current_device=self.current_device, gpu_id=self.gpu_id,
            quantization_type=self.quantization_type, compression_type=self.compression_type,
            access_count=self.access_count, last_access_timestamp=self.last_access_timestamp
        )

class TransferRequest:
    def __init__(self, layer_id: int, source_device_str: str, destination_device_str: str,
                 priority: int = 5, data_to_transfer_optional: Optional[torch.Tensor] = None,
                 completion_callback_optional: Optional[Callable] = None):
        self.layer_id = layer_id
        self.source_device = source_device_str
        self.destination_device = destination_device_str
        self.priority = priority
        self.timestamp = time.time()
        self.data_to_transfer: Optional[torch.Tensor] = data_to_transfer_optional
        self.callback: Optional[Callable] = completion_callback_optional
        self.status: str = "pending"
        self.error_message: Optional[str] = None

    def __lt__(self, other_request: 'TransferRequest') -> bool:
        if self.priority == other_request.priority:
            return self.timestamp < other_request.timestamp
        return self.priority < other_request.priority

    def update_status(self, new_status_str: str, error_msg_str: Optional[str] = None):
        self.status = new_status_str
        if error_msg_str: self.error_message = error_msg_str
        
        if new_status_str in ["completed", "failed"] and self.callback is not None:
            try:
                self.callback(self, new_status_str == "completed", self.error_message)
            except Exception as e_callback_exc:
                logger.error(f"Exception in TransferRequest callback for L{self.layer_id}: {e_callback_exc}", exc_info=True)

class LoadedModelContext:
    def __init__(self, model_name_or_id: str, resolved_local_path: str, hf_config_obj: AutoConfig,
                 hf_tokenizer_obj: PreTrainedTokenizerBase, model_specific_layer_ids: List[int],
                 target_primary_compute_device: torch.device, hf_api_auth_token: Optional[str] = None):
        self.name: str = model_name_or_id
        self.path: str = resolved_local_path
        self.hf_config: AutoConfig = hf_config_obj
        self.tokenizer: PreTrainedTokenizerBase = hf_tokenizer_obj
        self.layer_ids: List[int] = model_specific_layer_ids
        self.compute_device: torch.device = target_primary_compute_device
        self.architecture: str = hf_config_obj.model_type if hf_config_obj else "unknown"
        self.hf_token: Optional[str] = hf_api_auth_token

        self.layer_execution_order: List[int] = sorted(list(model_specific_layer_ids))

        self._temp_inference_model_instance: Optional[PreTrainedModel] = None
        self._temp_model_active_layers_state: Dict[str, torch.Tensor] = {}

    def get_layer_metadata(self, layer_id_val: int) -> Optional[LayerMetadata]:
        if layer_id_val in self.layer_ids:
            return layer_metadata_registry.get(layer_id_val)
        logger.warning(f"Attempted to get metadata for L{layer_id_val} which is not part of currently loaded model '{self.name}'.")
        return None

    def get_num_layers(self) -> int:
        return len(self.layer_ids)

    def to_status_api_model(self, current_operation_status_str: str, current_operation_error_msg: Optional[str] = None) -> ModelStatusAPIResponse:
        return ModelStatusAPIResponse(
            model_name=self.name, model_path=self.path, architecture=self.architecture,
            tokenizer_name=self.tokenizer.name_or_path if self.tokenizer else "N/A",
            num_managed_layers=self.get_num_layers(),
            compute_device=str(self.compute_device),
            status=current_operation_status_str,
            error_message=current_operation_error_msg
        )

    def clear_temp_inference_resources(self):
        if self._temp_inference_model_instance is not None:
            del self._temp_inference_model_instance
            self._temp_inference_model_instance = None
        self._temp_model_active_layers_state.clear()
        gc.collect()
        if self.compute_device.type == 'cuda':
            try:
                torch.cuda.empty_cache()
            except Exception as e_cuda_clear:
                logger.warning(f"Minor error during CUDA empty_cache: {e_cuda_clear}")

# Hardware Manager
class HardwareManager:
    def __init__(self, app_cfg: Dict):
        self.app_config = app_cfg
        self.ramdisk_actual_mount_path: Optional[str] = None
        self.monitor_thread: Optional[threading.Thread] = None
        logger.info("HardwareManager initialized.")

    def _cfg_path_get(self, *keys_tuple: str, default_val: Any = None) -> Any:
        data_node = self.app_config
        for key_item in keys_tuple:
            if isinstance(data_node, dict) and key_item in data_node: 
                data_node = data_node[key_item]
            else: 
                return default_val
        return data_node

    def detect_all_hardware(self):
        logger.info("Starting hardware detection...")
        
        # GPU Detection
        gpu_cfg = self._cfg_path_get("hardware", "gpu", default_val={})
        hardware_summary["gpu"]["available"] = torch.cuda.is_available()
        hardware_summary["gpu"]["count"] = torch.cuda.device_count() if hardware_summary["gpu"]["available"] else 0
        total_usable_vram_b = 0
        
        if hardware_summary["gpu"]["available"]:
            for i in range(hardware_summary["gpu"]["count"]):
                props = torch.cuda.get_device_properties(i)
                reserved_vram_mb = gpu_cfg.get("reserved_vram_mb_per_gpu", {}).get(str(i), gpu_cfg.get("reserved_vram_mb_default", 256))
                max_util_pct = gpu_cfg.get("max_utilization_percent_per_gpu", {}).get(str(i), gpu_cfg.get("max_utilization_percent_default", 90))
                
                usable_vram_for_gpu_b = int((props.total_memory - (reserved_vram_mb * 1024*1024)) * (max_util_pct / 100.0))
                usable_vram_for_gpu_b = max(0, usable_vram_for_gpu_b)
                total_usable_vram_b += usable_vram_for_gpu_b
                
                hardware_summary["gpu"]["devices"].append({
                    "id": i, "name": props.name, "total_memory_bytes": props.total_memory,
                    "usable_memory_bytes_planning": usable_vram_for_gpu_b,
                    "compute_capability": f"{props.major}.{props.minor}"
                })
                logger.info(f"GPU {i}: {props.name}, Total VRAM: {props.total_memory//(1024**2)}MB, Usable: {usable_vram_for_gpu_b//(1024**2)}MB")
        
        hardware_summary["gpu"]["total_usable_vram_bytes_planning"] = total_usable_vram_b

        # CPU Detection
        cpu_cfg = self._cfg_path_get("hardware", "cpu", default_val={})
        hardware_summary["cpu"] = {
            "cores_physical": psutil.cpu_count(logical=False), 
            "cores_logical": psutil.cpu_count(logical=True),
            "current_percent_usage_total": psutil.cpu_percent(interval=None),
            "max_utilization_percent_limit": cpu_cfg.get("max_utilization_percent", 85)
        }
        logger.info(f"CPU: {hardware_summary['cpu']['cores_physical']} physical cores, {hardware_summary['cpu']['cores_logical']} logical threads.")

        # System RAM Detection
        ram_cfg = self._cfg_path_get("hardware", "ram", default_val={})
        ram_stats_psutil = psutil.virtual_memory()
        max_ram_util_pct_cfg = ram_cfg.get("max_utilization_percent", 80)
        reserved_ram_mb_cfg = ram_cfg.get("reserved_ram_mb", 1024)
        usable_ram_for_planning_b = int(ram_stats_psutil.total * (max_ram_util_pct_cfg/100.0)) - (reserved_ram_mb_cfg * 1024*1024)
        dynamic_sys_buffer_mb = self._cfg_path_get("hardware", "ram", "system_buffer_mb_dynamic", default_val=512)
        usable_ram_dynamic_b = ram_stats_psutil.available - (dynamic_sys_buffer_mb * 1024*1024)
        
        hardware_summary["ram"] = {
            "total_bytes": ram_stats_psutil.total,
            "available_bytes_current": ram_stats_psutil.available,
            "percent_used_current": ram_stats_psutil.percent,
            "usable_bytes_for_planning": max(0, usable_ram_for_planning_b),
            "usable_bytes_dynamic_available": max(0, usable_ram_dynamic_b)
        }
        logger.info(f"System RAM: Total {ram_stats_psutil.total//(1024**3)}GB, Usable: {max(0, usable_ram_for_planning_b)//(1024**3)}GB")

        # NVMe Storage Detection
        nvme_cfg = self._cfg_path_get("hardware", "nvme", default_val={})
        nvme_base_storage_path_cfg = nvme_cfg.get("path")
        if nvme_base_storage_path_cfg:
            nvme_resolved_base_p = Path(nvme_base_storage_path_cfg).resolve()
            nvme_layers_dir_p = nvme_resolved_base_p / "ultra_tensor_server_layers"
            try:
                nvme_layers_dir_p.mkdir(parents=True, exist_ok=True)
                fs_stats_nvme = os.statvfs(nvme_layers_dir_p)
                total_fs_space_b = fs_stats_nvme.f_frsize * fs_stats_nvme.f_blocks
                free_fs_space_b = fs_stats_nvme.f_frsize * fs_stats_nvme.f_bavail
                max_server_usage_gb_cfg = nvme_cfg.get("max_server_utilization_gb", (free_fs_space_b/(1024**3)) * 0.95)
                min_fs_free_buffer_gb_cfg = nvme_cfg.get("min_filesystem_free_buffer_gb", 5)
                usable_nvme_for_server_b = min(free_fs_space_b - (min_fs_free_buffer_gb_cfg * 1024**3), max_server_usage_gb_cfg * 1024**3)
                
                hardware_summary["nvme"] = {
                    "available": True, "path": str(nvme_layers_dir_p), 
                    "filesystem_total_bytes": total_fs_space_b,
                    "filesystem_free_bytes_current": free_fs_space_b, 
                    "server_usable_bytes_limit": max(0, usable_nvme_for_server_b),
                    "health_stats": {"reads":0,"writes":0,"bytes_read":0,"bytes_written":0,"files":0,"errors":0}
                }
                logger.info(f"NVMe Storage: Path '{nvme_layers_dir_p}', FS Total {total_fs_space_b//(1024**3)}GB, Server Usable: {max(0, usable_nvme_for_server_b)//(1024**3)}GB")
            except Exception as e_nvme_setup:
                logger.warning(f"NVMe path '{nvme_base_storage_path_cfg}' configured, but error setting up storage: {e_nvme_setup}")
                hardware_summary["nvme"] = {"available": False, "path": None}
        else:
            logger.info("NVMe path not configured. NVMe storage features disabled.")
            hardware_summary["nvme"] = {"available": False, "path": None}

        # RAMDisk Setup
        ramdisk_cfg = self._cfg_path_get("hardware", "ramdisk", default_val={})
        if ramdisk_cfg.get("enabled", False):
            ramdisk_mount_target_p = Path(ramdisk_cfg.get("path", "./uts_ramdisk_mount_point")).resolve()
            self.ramdisk_actual_mount_path = str(ramdisk_mount_target_p)
            ramdisk_size_mb_cfg = ramdisk_cfg.get("size_mb", MIN_RAMDISK_SIZE_MB)
            ramdisk_layers_dir_p = ramdisk_mount_target_p / "ultra_tensor_server_layers"
            
            if self._os_setup_ramdisk(str(ramdisk_mount_target_p), ramdisk_size_mb_cfg):
                try:
                    ramdisk_layers_dir_p.mkdir(parents=True, exist_ok=True)
                    usable_ramdisk_pct_cfg = ramdisk_cfg.get("usable_percent_of_total", 95)
                    usable_ramdisk_for_server_b = int((ramdisk_size_mb_cfg * 1024*1024) * (usable_ramdisk_pct_cfg / 100.0))
                    
                    hardware_summary["ramdisk"] = {
                        "available": True, "path": str(ramdisk_layers_dir_p),
                        "total_bytes_allocated_os": ramdisk_size_mb_cfg * 1024*1024, 
                        "usable_bytes_for_server": usable_ramdisk_for_server_b,
                        "health_stats": {"reads":0,"writes":0,"bytes_read":0,"bytes_written":0,"files":0,"errors":0}
                    }
                    logger.info(f"RAMDisk: Path '{ramdisk_layers_dir_p}', Total {ramdisk_size_mb_cfg}MB, Usable: {usable_ramdisk_for_server_b//(1024**2)}MB")
                except Exception as e_ramdisk_layers_dir:
                    logger.error(f"RAMDisk OS setup okay, but error with layers subdir: {e_ramdisk_layers_dir}")
                    hardware_summary["ramdisk"] = {"available": False, "path": None}
            else: 
                hardware_summary["ramdisk"] = {"available": False, "path": None}
        else:
            logger.info("RAMDisk disabled in configuration.")
            hardware_summary["ramdisk"] = {"available": False, "path": None}

        global nvme_worker_pool
        if hardware_summary["nvme"]["available"] and not nvme_worker_pool:
            num_nvme_io_workers = nvme_cfg.get("worker_threads", os.cpu_count() or 2)
            nvme_worker_pool = concurrent.futures.ThreadPoolExecutor(max_workers=num_nvme_io_workers, thread_name_prefix="UTS_NVMeWorker")
            logger.info(f"NVMe I/O worker pool initialized with {num_nvme_io_workers} threads.")
        
        logger.info("Hardware detection complete.")

    def _os_setup_ramdisk(self, mount_target_path_str: str, size_mb_val: int) -> bool:
        target_mount_p = Path(mount_target_path_str)
        if target_mount_p.is_mount():
            logger.info(f"Path '{target_mount_p}' is already a mount point. Assuming existing RAMDisk.")
            return True
        
        try:
            target_mount_p.mkdir(parents=True, exist_ok=True)
            if sys.platform == "linux":
                mount_fs_options = f"size={size_mb_val}m,noatime,nodiratime,nosuid,nodev,mode=0700"
                mount_command_list = ["sudo", "mount", "-t", "tmpfs", "-o", mount_fs_options, "tmpfs", str(target_mount_p)]
                logger.info(f"Attempting to mount Linux RAMDisk: {' '.join(mount_command_list)}")
                try:
                    subprocess.run(mount_command_list, check=True, capture_output=True, text=True, timeout=15)
                    logger.info(f"Linux RAMDisk (tmpfs) mounted at '{target_mount_p}', size {size_mb_val}MB.")
                    return True
                except FileNotFoundError: 
                    logger.error(f"Sudo not found for RAMDisk mount. Manual setup needed."); return False
                except subprocess.TimeoutExpired: 
                    logger.error(f"Timeout mounting RAMDisk '{target_mount_p}'."); return False
                except subprocess.CalledProcessError as e_mount:
                    logger.warning(f"Failed to mount RAMDisk. Error: {e_mount.stderr.strip()}. Using as regular directory if writable.")
                    return target_mount_p.is_dir() and os.access(target_mount_p, os.W_OK)
            elif sys.platform == "darwin":
                logger.warning(f"macOS RAMDisk: Path '{target_mount_p}' used as regular directory. Manual setup recommended.")
                return target_mount_p.is_dir() and os.access(target_mount_p, os.W_OK)
            elif sys.platform == "win32":
                logger.info(f"Windows: Path '{target_mount_p}' used as regular directory (simulated RAMDisk).")
                return True
            else:
                logger.warning(f"RAMDisk unsupported on {sys.platform}. Path '{target_mount_p}' used as regular directory.")
                return target_mount_p.is_dir() and os.access(target_mount_p, os.W_OK)
        except Exception as e_os_ramdisk:
            logger.error(f"OS-level RAMDisk setup error for '{target_mount_p}': {e_os_ramdisk}", exc_info=True)
            return False

    def _resource_monitoring_loop(self):
        logger.info("Hardware resource monitor thread started.")
        interval_s = self._cfg_path_get("system", "monitoring_interval_seconds", default_val=15)
        
        while not main_stop_event.is_set():
            try:
                hardware_summary["cpu"]["current_percent_usage_total"] = psutil.cpu_percent(interval=0.1)
                ram_s = psutil.virtual_memory()
                hardware_summary["ram"]["available_bytes_current"] = ram_s.available
                hardware_summary["ram"]["percent_used_current"] = ram_s.percent
                dynamic_buf_mb = self._cfg_path_get("hardware", "ram", "system_buffer_mb_dynamic", default_val=512)
                hardware_summary["ram"]["usable_bytes_dynamic_available"] = max(0, ram_s.available - (dynamic_buf_mb * 1024*1024))

                if hardware_summary["nvme"]["available"] and hardware_summary["nvme"]["path"]:
                    nvme_p = Path(hardware_summary["nvme"]["path"])
                    if nvme_p.exists():
                        try: 
                            hardware_summary["nvme"]["filesystem_free_bytes_current"] = os.statvfs(nvme_p).f_bavail * os.statvfs(nvme_p).f_frsize
                        except OSError as e: 
                            logger.warning(f"NVMe monitor stat error '{nvme_p}': {e}")
                
                if hardware_summary["ramdisk"]["available"] and hardware_summary["ramdisk"]["path"]:
                    rd_p = Path(hardware_summary["ramdisk"]["path"])
                    if rd_p.exists():
                        try:
                            if sys.platform == "linux" and self.ramdisk_actual_mount_path and Path(self.ramdisk_actual_mount_path).is_mount():
                                 hardware_summary["ramdisk"]["filesystem_free_bytes_current"] = os.statvfs(rd_p).f_bavail * os.statvfs(rd_p).f_frsize
                            else:
                                hardware_summary["ramdisk"]["filesystem_free_bytes_current"] = hardware_summary["ramdisk"]["total_bytes_allocated_os"] - sum(f.stat().st_size for f in rd_p.glob('**/*') if f.is_file())
                        except OSError as e: 
                            logger.warning(f"RAMDisk monitor stat error '{rd_p}': {e}")
            except Exception as e_mon_loop: 
                logger.error(f"Resource monitor loop error: {e_mon_loop}", exc_info=False)
            
            for _ in range(int(interval_s)): 
                if main_stop_event.is_set(): break
                time.sleep(1)
            if main_stop_event.is_set(): break
        
        logger.info("Hardware resource monitor thread stopped.")

    def start_monitoring_thread(self):
        if not self.monitor_thread or not self.monitor_thread.is_alive():
            self.monitor_thread = threading.Thread(target=self._resource_monitoring_loop, name="UTS_HWMonitor", daemon=True)
            self.monitor_thread.start()
            logger.info("Hardware monitoring thread initiated.")

    def stop_monitoring_and_perform_cleanup(self):
        logger.info("Stopping hardware monitoring & performing cleanup...")
        if self.monitor_thread and self.monitor_thread.is_alive():
            self.monitor_thread.join(timeout=max(5, self._cfg_path_get("system", "monitoring_interval_seconds", default_val=15) + 2))
            if self.monitor_thread.is_alive(): 
                logger.warning("HW monitoring thread did not stop promptly.")
        
        ramdisk_cfg = self._cfg_path_get("hardware", "ramdisk", default_val={})
        if self.ramdisk_actual_mount_path and ramdisk_cfg.get("enabled", False) and ramdisk_cfg.get("cleanup_on_exit", True):
            mount_p = Path(self.ramdisk_actual_mount_path)
            logger.info(f"Attempting RAMDisk cleanup for: {mount_p}")
            layers_dir_on_ramdisk = Path(hardware_summary["ramdisk"].get("path", ""))
            if layers_dir_on_ramdisk.exists() and layers_dir_on_ramdisk.is_dir():
                try: 
                    shutil.rmtree(layers_dir_on_ramdisk)
                    logger.info(f"Removed RAMDisk layers dir: {layers_dir_on_ramdisk}")
                except Exception as e: 
                    logger.error(f"Error removing RAMDisk layers dir '{layers_dir_on_ramdisk}': {e}")
            
            if sys.platform == "linux" and mount_p.is_mount():
                umount_cmd = ["sudo", "umount", str(mount_p)]
                logger.info(f"Unmounting Linux RAMDisk: {' '.join(umount_cmd)}")
                try:
                    subprocess.run(umount_cmd, check=True, capture_output=True, text=True, timeout=10)
                    logger.info(f"RAMDisk '{mount_p}' unmounted.")
                except Exception as e_umount: 
                    logger.warning(f"RAMDisk unmount error for '{mount_p}': {e_umount}")
            elif mount_p.exists() and not layers_dir_on_ramdisk.exists():
                 try:
                     if not any(mount_p.iterdir()): 
                         mount_p.rmdir()
                         logger.info(f"Removed empty RAMDisk mount dir: {mount_p}")
                 except Exception as e_rm_mountp: 
                     logger.warning(f"Could not remove potentially empty RAMDisk mount dir '{mount_p}': {e_rm_mountp}")
        
        logger.info("HardwareManager cleanup finished.")

# FastAPI Application
app = FastAPI(
    title="Ultra Tensor Server",
    version="1.3.0",
    description="Advanced AI model inference server with dynamic layer management.",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

api_key_header_scheme = APIKeyHeader(name="X-API-Key", auto_error=False)

async def verify_api_key_dependency_runtime(api_key_provided: Optional[str] = Security(api_key_header_scheme)):
    server_configured_api_key = config.get("api", {}).get("api_key")
    
    if server_configured_api_key:
        if not api_key_provided:
            logger.warning("API call rejected: X-API-Key header is missing.")
            raise HTTPException(status_code=401, detail="X-API-Key header is required.")
        
        if api_key_provided != server_configured_api_key:
            logger.warning(f"API call rejected: Invalid API Key provided.")
            raise HTTPException(status_code=403, detail="Invalid API Key provided.")
        
        logger.debug("API Key verified successfully.")
        return True
    
    return True

@app.on_event("startup")
async def on_startup_event_handler():
    global config, hardware_mgr, api_key_auth_check

    # Load Configuration
    config_file_arg = sys.argv[1] if len(sys.argv) > 1 else CONFIG_FILE_PATH
    resolved_config_path = Path(config_file_arg).resolve()
    
    if not resolved_config_path.is_file():
        # Create default config if not exists
        default_config = {
            "system": {
                "log_level": "INFO",
                "log_file": "ultra_tensor_server.log",
                "monitoring_interval_seconds": 15
            },
            "api": {
                "host": "0.0.0.0",
                "port": 8000,
                "api_key": None
            },
            "hardware": {
                "gpu": {
                    "reserved_vram_mb_default": 256,
                    "max_utilization_percent_default": 90
                },
                "cpu": {
                    "max_utilization_percent": 85
                },
                "ram": {
                    "reserved_ram_mb": 1024,
                    "max_utilization_percent": 80,
                    "system_buffer_mb_dynamic": 512
                },
                "nvme": {
                    "path": "/tmp/tensor_storage",
                    "max_server_utilization_gb": 50,
                    "min_filesystem_free_buffer_gb": 5,
                    "worker_threads": 4
                },
                "ramdisk": {
                    "enabled": False,
                    "path": "/tmp/uts_ramdisk",
                    "size_mb": 1024,
                    "usable_percent_of_total": 95,
                    "cleanup_on_exit": True
                }
            }
        }
        
        with open(resolved_config_path, "w") as f:
            json.dump(default_config, f, indent=2)
        logger.info(f"Created default config at: {resolved_config_path}")
    
    with open(resolved_config_path, "r") as f_config:
        config = json.load(f_config)

    # Initialize Hardware Manager
    hardware_mgr = HardwareManager(config)
    hardware_mgr.detect_all_hardware()
    hardware_mgr.start_monitoring_thread()

    # Setup API Key Authentication
    if config.get("api", {}).get("api_key"):
        api_key_auth_check = verify_api_key_dependency_runtime
        logger.info("API Key authentication is ENABLED.")
    else:
        async def open_access_placeholder(): return True
        api_key_auth_check = open_access_placeholder
        logger.info("API Key authentication is DISABLED.")

    server_host_cfg = config.get('api',{}).get('host','0.0.0.0')
    server_port_cfg = config.get('api',{}).get('port',8000)
    logger.info(f"Ultra Tensor Server (v{app.version}) initialized. Listening on http://{server_host_cfg}:{server_port_cfg}")

@app.on_event("shutdown")
async def on_shutdown_event_handler():
    logger.info("Ultra Tensor Server received shutdown signal. Initiating graceful shutdown...")
    main_stop_event.set()
    
    if hardware_mgr: 
        hardware_mgr.stop_monitoring_and_perform_cleanup()

    logger.info("Performing final garbage collection...")
    gc.collect()
    if torch.cuda.is_available(): 
        try: torch.cuda.empty_cache()
        except Exception as e: logger.warning(f"Error during final CUDA empty_cache: {e}")
    
    logger.info("Ultra Tensor Server shutdown complete.")

# API Endpoints
@app.get("/api", summary="Root server info", dependencies=[Depends(lambda: api_key_auth_check())])
async def api_get_root_info():
    return { 
        "server_name": app.title, 
        "version": app.version, 
        "status": "running",
        "docs": app.docs_url, 
        "time_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

@app.get("/api/status", response_model=ServerStatusAPIResponse, summary="Detailed server status", dependencies=[Depends(lambda: api_key_auth_check())])
async def api_get_server_status():
    if not hardware_mgr:
        raise HTTPException(status_code=503, detail="Core managers not initialized.")
    
    return ServerStatusAPIResponse(
        server_status="running" if not main_stop_event.is_set() else "shutting_down",
        uptime_seconds=round(time.monotonic() - server_start_time, 2),
        model_status=ModelStatusAPIResponse(status="no_model_loaded"),
        hardware_summary=hardware_summary,
        layer_transfer_queue_size=layer_transfer_queue.qsize(),
        prefetch_job_queue_size=prefetch_job_queue.qsize(),
        active_threads=threading.active_count(),
        log_file_path=hardware_summary.get("log_file_path")
    )

@app.get("/api/hardware", summary="Get hardware information", dependencies=[Depends(lambda: api_key_auth_check())])
async def api_get_hardware_info():
    return hardware_summary

@app.get("/api/layers", response_model=List[LayerInfoAPI], summary="List all managed layers", dependencies=[Depends(lambda: api_key_auth_check())])
async def api_get_all_layers():
    return [meta.to_api_model() for meta in layer_metadata_registry.values()]

@app.post("/api/layers/transfer", summary="Request layer transfer", status_code=202, dependencies=[Depends(lambda: api_key_auth_check())])
async def api_transfer_layer(req_api: TransferRequestAPI):
    meta = layer_metadata_registry.get(req_api.layer_id)
    if not meta: 
        raise HTTPException(status_code=404, detail=f"Layer ID {req_api.layer_id} not found.")
    
    valid_prefixes = ["cpu", "gpu", "ramdisk", "nvme"]
    if not any(req_api.destination_device.startswith(p) for p in valid_prefixes):
         raise HTTPException(status_code=400, detail="Invalid destination_device format.")

    transfer_obj = TransferRequest(meta.id, meta.current_device, req_api.destination_device, req_api.priority)
    try: 
        layer_transfer_queue.put_nowait(transfer_obj)
    except queue.Full: 
        raise HTTPException(status_code=503, detail="Layer transfer queue full.")
    
    return {"message": "Transfer request queued.", "layer_id": meta.id, "destination": req_api.destination_device}

# Add error handling to API endpoints
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception in {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.warning(f"HTTP exception in {request.method} {request.url}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )

# Main execution
if __name__ == "__main__":
    uvicorn_target_host = "0.0.0.0"
    uvicorn_target_port = 8000
    
    try:
        config_file_arg_for_main = sys.argv[1] if len(sys.argv) > 1 else CONFIG_FILE_PATH
        path_to_check_config = Path(config_file_arg_for_main)
        if path_to_check_config.is_file():
            with open(path_to_check_config, "r") as f_main_cfg:
                temp_cfg_data_for_main = json.load(f_main_cfg)
            uvicorn_target_host = temp_cfg_data_for_main.get("api",{}).get("host", uvicorn_target_host)
            uvicorn_target_port = temp_cfg_data_for_main.get("api",{}).get("port", uvicorn_target_port)
    except Exception as e_main_cfg_parse:
        logger.warning(f"Could not pre-parse config file for Uvicorn host/port settings: {e_main_cfg_parse}")

    logger.info(f"Starting Uvicorn server on {uvicorn_target_host}:{uvicorn_target_port}")
    
    try:
        # Add signal handlers for graceful shutdown
        import signal
        
        def signal_handler(signum, frame):
            logger.info(f"Received signal {signum}. Initiating graceful shutdown...")
            main_stop_event.set()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        uvicorn.run(
            "__main__:app",
            host=uvicorn_target_host,
            port=uvicorn_target_port,
            reload=False,
            log_level="info"
        )
    except KeyboardInterrupt:
        logger.info("KeyboardInterrupt received. Server shutting down.")
    except Exception as e_main_uvicorn_run:
        logger.fatal(f"Critical exception during Uvicorn execution: {e_main_uvicorn_run}", exc_info=True)
        sys.exit(1)
    finally:
        if not main_stop_event.is_set():
            main_stop_event.set()
        time.sleep(0.5)
        logger.info("Tensor server shutdown complete.")
