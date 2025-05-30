import torch
import multiprocessing as mp
import psutil
import time
import os
import json
import logging
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("TensorDaemon")

class TensorDaemon:
    def __init__(self, cpu_usage_limit=85, microbatch_size=32):
        self.cpu_usage_limit = cpu_usage_limit
        self.microbatch_size = microbatch_size
        self.ctx = mp.get_context('spawn')
        self.task_queue = None
        self.result_queue = None
        self.workers = []
        self.is_running = False
        
    def safe_submit(self, input_tensor: torch.Tensor) -> int:
        """Safely detaches and splits tensor into microbatches and queues them for processing."""
        if not self.is_running:
            raise RuntimeError("TensorDaemon is not running. Call start() first.")
            
        input_tensor = input_tensor.detach().cpu()
        batch_size = input_tensor.size(0)
        batch_count = 0
        
        for start_idx in range(0, batch_size, self.microbatch_size):
            end_idx = min(start_idx + self.microbatch_size, batch_size)
            microbatch = input_tensor[start_idx:end_idx]
            self.task_queue.put((start_idx, microbatch))
            batch_count += 1
            
        return batch_count

    def safe_receive(self, expected_batches: int) -> torch.Tensor:
        """Safely receives results from the daemon and reassembles in correct order."""
        if not self.is_running:
            raise RuntimeError("TensorDaemon is not running.")
            
        results = {}
        for _ in range(expected_batches):
            idx, out = self.result_queue.get()
            results[idx] = out
            
        output_tensor = torch.cat([results[i] for i in sorted(results.keys())])
        return output_tensor

    def persistent_worker(self, model_state_dict: Dict, worker_id: int):
        """Persistent worker process that handles tensor processing."""
        # Recreate model in worker process
        model = torch.nn.Sequential(
            torch.nn.Linear(512, 256),
            torch.nn.ReLU(),
            torch.nn.Linear(256, 128)
        )
        model.load_state_dict(model_state_dict)
        model.eval()

        # Set CPU affinity for this worker
        if worker_id is not None:
            safe_cores = list(range(0, int(mp.cpu_count() * 0.85)))
            if worker_id < len(safe_cores):
                p = psutil.Process(os.getpid())
                try:
                    p.cpu_affinity([safe_cores[worker_id]])
                except Exception as e:
                    logger.warning(f"Could not set CPU affinity for worker {worker_id}: {e}")

        logger.info(f"Worker {worker_id} started and ready for processing")

        while True:
            # Check CPU usage and throttle if necessary
            while psutil.cpu_percent(interval=0.1) > self.cpu_usage_limit:
                time.sleep(0.05)

            try:
                item = self.task_queue.get(timeout=1)
                if item is None:  # Shutdown signal
                    break
                    
                idx, micro_input = item
                micro_input = micro_input.detach()
                
                with torch.no_grad():
                    output = model(micro_input)
                    
                self.result_queue.put((idx, output.cpu().detach()))
                
            except Exception as e:
                logger.error(f"Worker {worker_id} error: {e}")
                continue

        logger.info(f"Worker {worker_id} shutting down")

    def start(self, model_state_dict: Dict):
        """Start the tensor daemon with the given model."""
        if self.is_running:
            logger.warning("TensorDaemon is already running")
            return

        self.task_queue = self.ctx.Queue()
        self.result_queue = self.ctx.Queue()

        total_cpus = mp.cpu_count()
        worker_count = max(1, int(total_cpus * (self.cpu_usage_limit / 100.0)))
        
        logger.info(f"Starting TensorDaemon with {worker_count} workers (CPU limit: {self.cpu_usage_limit}%)")

        self.workers = []
        for i in range(worker_count):
            p = self.ctx.Process(
                target=self.persistent_worker, 
                args=(model_state_dict, i)
            )
            p.start()
            self.workers.append(p)

        self.is_running = True
        logger.info("TensorDaemon started successfully")

    def shutdown(self):
        """Shutdown the tensor daemon."""
        if not self.is_running:
            logger.warning("TensorDaemon is not running")
            return

        logger.info("Shutting down TensorDaemon...")
        
        # Send shutdown signals
        for _ in self.workers:
            self.task_queue.put(None)
        
        # Wait for workers to finish
        for p in self.workers:
            p.join(timeout=5)
            if p.is_alive():
                logger.warning(f"Force terminating worker {p.pid}")
                p.terminate()
                p.join()

        self.workers = []
        self.task_queue = None
        self.result_queue = None
        self.is_running = False
        
        logger.info("TensorDaemon shutdown complete")

    def process_tensor(self, input_tensor: torch.Tensor) -> torch.Tensor:
        """Process a tensor through the daemon and return the result."""
        expected_batches = self.safe_submit(input_tensor)
        return self.safe_receive(expected_batches)

def main():
    """Main function for testing the TensorDaemon."""
    logger.info("🔥 Booting TensorDaemon Supreme Engine 🔥")

    # Create a dummy model for testing
    model = torch.nn.Sequential(
        torch.nn.Linear(512, 256),
        torch.nn.ReLU(),
        torch.nn.Linear(256, 128)
    )

    # Initialize daemon
    daemon = TensorDaemon(cpu_usage_limit=85, microbatch_size=64)
    
    try:
        # Start daemon
        daemon.start(model.state_dict())
        
        logger.info("✅ TensorDaemon active. Ready for processing.")
        
        # Test processing
        while True:
            logger.info("Waiting for tensor tasks... (CTRL+C to stop)")
            time.sleep(5)
            
            # Create test input
            input_tensor = torch.randn(2048, 512, requires_grad=False)
            logger.info(f"Processing tensor with shape: {input_tensor.shape}")
            
            # Process through daemon
            start_time = time.time()
            output_tensor = daemon.process_tensor(input_tensor)
            end_time = time.time()
            
            logger.info(f"Output shape: {output_tensor.shape}, Processing time: {end_time - start_time:.3f}s")

    except KeyboardInterrupt:
        logger.info("🔻 Shutdown signal received. Stopping TensorDaemon...")
    finally:
        daemon.shutdown()

if __name__ == "__main__":
    main()
