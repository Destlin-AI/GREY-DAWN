#!/usr/bin/env python
# Get status of tensor system

import os
import sys
import json
import argparse
import time
import random

def get_lm_studio_status():
    """Get status from LM Studio API"""
    import requests
    
    try:
        response = requests.get("http://localhost:1234/v1/status", timeout=2)
        return response.json()
    except:
        return None

def get_tensor_status():
    """Get tensor system status"""
    # In a real implementation, this would get actual status
    # For now, we'll return mock data
    
    # Try to get LM Studio status
    lm_studio_status = get_lm_studio_status()
    
    # Get model info from LM Studio if available
    model_name = "Unknown"
    parameters = 0
    if lm_studio_status and "model" in lm_studio_status:
        model_name = lm_studio_status["model"].get("name", "Unknown")
        
        # Try to determine parameters from name
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
    
    # Determine number of layers based on parameters
    total_layers = 0
    if parameters == 7:
        total_layers = 32
    elif parameters == 13 or parameters == 14:
        total_layers = 40
    elif parameters == 30:
        total_layers = 60
    elif parameters == 65 or parameters == 70:
        total_layers = 80
    
    # Generate mock layer allocation
    gpu_layers = min(24, total_layers)
    cpu_layers = min(total_layers - gpu_layers, 16)
    nvme_layers = total_layers - gpu_layers - cpu_layers
    
    # Generate mock layer map
    layer_map = {}
    for i in range(total_layers):
        if i < gpu_layers:
            layer_map[str(i)] = "gpu"
        elif i < gpu_layers + cpu_layers:
            layer_map[str(i)] = "cpu"
        else:
            layer_map[str(i)] = "nvme"
    
    return {
        "running": True,
        "gpu_name": "NVIDIA RTX 3070",
        "gpu_utilization": random.randint(60, 95),
        "memory_usage": random.randint(6, 8),
        "ram_total": 32,
        "ram_utilization": random.randint(40, 70),
        "nvme_total": 500,
        "nvme_utilization": random.randint(10, 30),
        "total_layers": total_layers,
        "gpu_layers": gpu_layers,
        "cpu_layers": cpu_layers,
        "nvme_layers": nvme_layers,
        "layer_map": layer_map
    }

def main():
    status = get_tensor_status()
    print(json.dumps(status, indent=2))

if __name__ == "__main__":
    main()
