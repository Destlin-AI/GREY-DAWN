/**
 * Tensor Engine - Main integration point for the distributed tensor processing system
 * This file serves as the bridge between the GRAVEMIND system and the tensor processing capabilities
 */

import { spawn } from "child_process"
import path from "path"
import fs from "fs"
import { logger } from "../utils"

interface TensorEngineOptions {
  configPath?: string
  autoStart?: boolean
  modelName?: string
  enableNVME?: boolean
}

export class TensorEngine {
  private process: any = null
  private configPath: string
  private isRunning = false
  private modelName = "default"
  private enableNVME = true
  private enginePath: string

  constructor(options: TensorEngineOptions = {}) {
    this.configPath = options.configPath || path.join(process.cwd(), "tensor-config.json")
    this.modelName = options.modelName || "default"
    this.enableNVME = options.enableNVME !== undefined ? options.enableNVME : true
    this.enginePath = process.env.TENSOR_SCRIPTS_PATH || path.join(process.cwd(), "lib", "tensor-engine", "scripts")

    if (options.autoStart) {
      this.start()
    }
  }

  /**
   * Start the tensor engine process
   */
  async start(): Promise<boolean> {
    if (this.isRunning) {
      logger.info("Tensor engine is already running")
      return true
    }

    try {
      // Ensure config exists
      await this.ensureConfig()

      // Determine which script to run based on NVME setting
      const scriptName = this.enableNVME ? "tensor_server_nvme.py" : "adaptive_tensor_server.py"
      const scriptPath = path.join(this.enginePath, scriptName)

      if (!fs.existsSync(scriptPath)) {
        logger.error(`Tensor engine script not found: ${scriptPath}`)
        return false
      }

      // Start the process
      logger.info(`Starting tensor engine with ${scriptPath} ${this.configPath}`)
      this.process = spawn("python", [scriptPath, this.configPath], {
        stdio: "pipe",
        detached: false,
      })

      this.process.stdout.on("data", (data: Buffer) => {
        logger.info(`[TensorEngine] ${data.toString().trim()}`)
      })

      this.process.stderr.on("data", (data: Buffer) => {
        logger.error(`[TensorEngine] ${data.toString().trim()}`)
      })

      this.process.on("close", (code: number) => {
        logger.info(`Tensor engine process exited with code ${code}`)
        this.isRunning = false
      })

      this.isRunning = true
      return true
    } catch (error) {
      logger.error(`Failed to start tensor engine: ${error}`)
      return false
    }
  }

  /**
   * Stop the tensor engine process
   */
  async stop(): Promise<boolean> {
    if (!this.isRunning || !this.process) {
      return true
    }

    return new Promise((resolve) => {
      this.process.on("close", () => {
        this.isRunning = false
        resolve(true)
      })

      this.process.kill()

      // Force kill after timeout
      setTimeout(() => {
        if (this.isRunning) {
          this.process.kill("SIGKILL")
          this.isRunning = false
          resolve(true)
        }
      }, 5000)
    })
  }

  /**
   * Check if the tensor engine is running
   */
  isActive(): boolean {
    return this.isRunning
  }

  /**
   * Ensure the configuration file exists
   */
  private async ensureConfig(): Promise<void> {
    if (fs.existsSync(this.configPath)) {
      return
    }

    // Create default config
    const defaultConfig = {
      system: {
        name: "GRAVEMIND Tensor Engine",
        version: "1.0.0",
        auto_detect_resources: true,
        description: "Hardware-aware distributed inference system with NVME offloading",
      },
      hardware: {
        gpu: {
          max_utilization: 0.95,
          reserved_vram_mb: 512,
          precision: "fp16",
          batch_size: 1,
          cuda_streams: 4,
        },
        cpu: {
          max_thread_percent: 85,
          pin_memory: true,
          numa_aware: true,
          thread_batch_size: 4,
        },
        nvme: {
          path: process.env.AGENT_PATH || path.join(process.cwd(), "nvme_cache"),
          max_utilization_gb: 950,
          min_read_speed_mbps: 1800,
          safe_write_speed_mbps: 1200,
        },
        ram: {
          max_utilization_percent: 85,
          swap_threshold_gb: 4,
          emergency_release_percent: 15,
        },
      },
      layer_allocation: {
        strategy: "hardware_optimized",
        auto_balance: true,
        nvme_threshold_layer_size_mb: 150,
        gpu_layer_count: "auto",
        cpu_layer_count: "auto",
        nvme_layer_count: "auto",
      },
      api: {
        host: "127.0.0.1",
        port: 8080,
        workers: 1,
        timeout_seconds: 300,
      },
    }

    fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2))
  }

  /**
   * Get the status of the tensor engine
   */
  async getStatus(): Promise<any> {
    if (!this.isRunning) {
      return { status: "stopped" }
    }

    try {
      const response = await fetch(`http://127.0.0.1:8080/status`)
      if (response.ok) {
        return await response.json()
      }
      return { status: "running", error: "Failed to fetch status" }
    } catch (error) {
      return { status: "running", error: String(error) }
    }
  }

  /**
   * Get information about layer allocation
   */
  async getLayers(): Promise<any> {
    if (!this.isRunning) {
      return { error: "Tensor engine not running" }
    }

    try {
      const response = await fetch(`http://127.0.0.1:8080/layers`)
      if (response.ok) {
        return await response.json()
      }
      return { error: "Failed to fetch layers" }
    } catch (error) {
      return { error: String(error) }
    }
  }
}

// Singleton instance
let tensorEngineInstance: TensorEngine | null = null

export function getTensorEngine(options: TensorEngineOptions = {}): TensorEngine {
  if (!tensorEngineInstance) {
    tensorEngineInstance = new TensorEngine(options)
  }
  return tensorEngineInstance
}
