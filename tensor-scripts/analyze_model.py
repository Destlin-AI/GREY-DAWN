#!/usr/bin/env python
# Model analyzer for tensor optimization

import os
import sys
import json
import argparse
import math
from pathlib import Path

def get_gpu_info():
    """Get GPU information"""
    try:
        import torch
        if not torch.cuda.is_available():
            return {
                "available": False,
                "count": 0,
                "vram_mb": 0,
                "name": "None"
            }
        
        return {
            "available": True,
            "count": torch.cuda.device_count(),
            "vram_mb": torch.cuda.get_device_properties(0).total_memory // (1024 * 1024),
            "name": torch.cuda.get_device_name(0)
        }
    except ImportError:
        return {
            "available": False,
            "count": 0,
            "vram_mb": 0,
            "name": "None (torch not available)"
        }

def get_system_info():
    """Get system information"""
    import psutil
    
    return {
        "cpu_count": psutil.cpu_count(logical=False),
        "cpu_threads": psutil.cpu_count(logical=True),
        "ram_gb": psutil.virtual_memory().total / (1024 * 1024 * 1024)
    }

def analyze_model(model_path):
    """Analyze model and determine optimal layer allocation"""
    model_path = Path(model_path)
    
    # Check if path exists
    if not model_path.exists():
        return {
            "error": f"Model path does not exist: {model_path}"
        }
    
    # Get model name
    model_name = model_path.name
    
    # Determine model size from name or folder structure
    parameters = 0
    if "7b" in model_name.lower():
        parameters = 7
    elif "13b" in model_name.lower():
        parameters = 13
    elif "14b" in model_name.lower():
        parameters = 14
    elif "30b" in model_name.lower():
        parameters = 30
    elif "65b" in model_name.lower():
        parameters = 65
    elif "70b" in model_name.lower():
        parameters = 70
    else:
        # Try to determine from folder structure
        try:
            # Look for config.json or similar files
            config_files = list(model_path.glob("*config*.json"))
            if config_files:
                with open(config_files[0], "r") as f:
                    config = json.load(f)
                    if "hidden_size" in config and "num_hidden_layers" in config:
                        # Estimate parameters from architecture
                        h = config["hidden_size"]
                        l = config["num_hidden_layers"]
                        parameters = round(12 * h * h * l / 1e9)  # Rough estimate
        except:
            pass
    
    # Estimate number of layers
    layers = 0
    if parameters == 7:
        layers = 32
    elif parameters == 13 or parameters == 14:
        layers = 40
    elif parameters == 30:
        layers = 60
    elif parameters == 65 or parameters == 70:
        layers = 80
    
    # Get hardware info
    gpu_info = get_gpu_info()
    system_info = get_system_info()
    
    # Calculate optimal layer allocation
    gpu_layers = 0
    cpu_layers = 0
    nvme_layers = 0
    
    if gpu_info["available"]:
        # Estimate how many layers can fit in GPU VRAM
        # This is a simplified calculation
        vram_mb = gpu_info["vram_mb"]
        
        # Reserve some VRAM for other operations
        available_vram_mb = vram_mb - 2000  # Reserve 2GB
        
        # Estimate layer size based on parameters
        layer_size_mb = 0
        if parameters == 7:
            layer_size_mb = 150
        elif parameters == 13 or parameters == 14:
            layer_size_mb = 300
        elif parameters == 30:
            layer_size_mb = 600
        elif parameters == 65 or parameters == 70:
            layer_size_mb = 1200
        
        if layer_size_mb > 0:
            gpu_layers = min(layers, int(available_vram_mb / layer_size_mb))
    
    # Calculate how many layers can fit in RAM
    ram_gb = system_info["ram_gb"]
    available_ram_gb = ram_gb - 4  # Reserve 4GB for system
    
    # Estimate layer size in RAM (usually 2x the size in VRAM due to FP32)
    ram_layer_size_gb = 0
    if parameters == 7:
        ram_layer_size_gb = 0.3
    elif parameters == 13 or parameters == 14:
        ram_layer_size_gb = 0.6
    elif parameters == 30:
        ram_layer_size_gb = 1.2
    elif parameters == 65 or parameters == 70:
        ram_layer_size_gb = 2.4
    
    if ram_layer_size_gb > 0:
        cpu_layers = min(layers - gpu_layers, int(available_ram_gb / ram_layer_size_gb))
    
    # Remaining layers go to NVME
    nvme_layers = layers - gpu_layers - cpu_layers
    
    # Determine optimal thread count
    threads = min(system_info["cpu_threads"], 8)  # Cap at 8 threads
    
    return {
        "model_path": str(model_path),
        "name": model_name,
        "parameters": parameters,
        "layers": layers,
        "hardware": {
            "gpu": gpu_info,
            "system": system_info
        },
        "recommended": {
            "gpu_layers": gpu_layers,
            "cpu_layers": cpu_layers,
            "nvme_layers": nvme_layers,
            "threads": threads
        }
    }

def main():
    parser = argparse.ArgumentParser(description="Analyze model for tensor optimization")
    parser.add_argument("--model-path", required=True, help="Path to the model")
    parser.add_argument("--gpu-detect", action="store_true", help="Detect GPU information")
    
    args = parser.parse_args()
    
    result = analyze_model(args.model_path)
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
