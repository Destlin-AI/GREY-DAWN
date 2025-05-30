#!/usr/bin/env python
# Stop tensor system

import os
import sys
import json
import argparse
import signal
import time

def find_tensor_processes():
    """Find tensor system processes"""
    import psutil
    
    tensor_processes = []
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            cmdline = proc.info['cmdline']
            if cmdline and any('tensor_server' in arg for arg in cmdline if arg):
                tensor_processes.append(proc)
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
    
    return tensor_processes

def stop_tensor_system():
    """Stop tensor system processes"""
    processes = find_tensor_processes()
    
    if not processes:
        print(json.dumps({
            "success": True,
            "message": "No tensor processes found"
        }))
        return
    
    for proc in processes:
        try:
            proc.terminate()
        except:
            pass
    
    # Wait for processes to terminate
    gone, alive = psutil.wait_procs(processes, timeout=3)
    
    # Force kill any remaining processes
    for proc in alive:
        try:
            proc.kill()
        except:
            pass
    
    print(json.dumps({
        "success": True,
        "terminated": len(gone),
        "killed": len(alive)
    }))

def main():
    stop_tensor_system()

if __name__ == "__main__":
    main()
