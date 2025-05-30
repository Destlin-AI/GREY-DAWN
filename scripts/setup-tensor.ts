/**
 * Setup script for tensor acceleration
 * Run with: npx tsx scripts/setup-tensor.ts
 */

import fs from "fs"
import path from "path"
import { execSync } from "child_process"

// Directories
const SCRIPT_DIR = path.join(process.cwd(), "tensor-scripts")
const NVME_CACHE_DIR = path.join(process.cwd(), "nvme_cache")

// Create directories
console.log("Creating directories...")
fs.mkdirSync(SCRIPT_DIR, { recursive: true })
fs.mkdirSync(NVME_CACHE_DIR, { recursive: true })

// Check Python installation
console.log("Checking Python installation...")
try {
  const pythonVersion = execSync("python --version").toString()
  console.log(`Found ${pythonVersion.trim()}`)
} catch (error) {
  console.error("Python not found. Please install Python 3.8 or newer.")
  process.exit(1)
}

// Check required Python packages
console.log("Checking required Python packages...")
try {
  execSync("pip install torch fastapi uvicorn pydantic numpy psutil zstandard")
  console.log("Required packages installed")
} catch (error) {
  console.error("Failed to install required packages:", error)
  process.exit(1)
}

// Create a simple README
const readmeContent = `# Tensor Acceleration Scripts

This directory contains Python scripts for tensor acceleration.

## Required Files
- tensor_server_nvme.py - Main tensor server with NVME support
- adaptive_tensor_server.py - Alternative server with adaptive allocation
- tensor_enhancements.py - Enhancements for tensor processing
- auto_allocation.py - Automatic layer allocation

## Setup
1. Copy your tensor scripts to this directory
2. Make sure Python 3.8+ is installed
3. Required packages: torch, fastapi, uvicorn, pydantic, numpy, psutil, zstandard

## Usage
The tensor acceleration system will be available in the dashboard under "Acceleration".
`

fs.writeFileSync(path.join(SCRIPT_DIR, "README.md"), readmeContent)

// Create a simple batch file for Windows users
const batchContent = `@echo off
echo ===================================================
echo TENSOR ACCELERATION SETUP
echo ===================================================
echo This script will set up everything from scratch!
echo.

REM Check if Python is installed
python --version > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or newer from python.org
    pause
    exit /b 1
)

echo Python detected! Setting up environment...
echo.

REM Install required packages
echo Installing required Python packages...
pip install torch fastapi uvicorn pydantic numpy psutil zstandard
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Some dependencies failed to install
    echo You may need to install them manually
    pause
)

echo.
echo ===================================================
echo SETUP COMPLETE!
echo ===================================================
echo.
echo To use tensor acceleration:
echo 1. Copy your tensor scripts to the tensor-scripts folder
echo 2. Start the application and go to Dashboard > Acceleration
echo.
echo Press any key to exit...
pause > nul
`

fs.writeFileSync(path.join(SCRIPT_DIR, "setup.bat"), batchContent)

console.log("\nSetup complete!")
console.log("Next steps:")
console.log("1. Copy your tensor scripts to the tensor-scripts folder")
console.log("2. Start the application and go to Dashboard > Acceleration")
