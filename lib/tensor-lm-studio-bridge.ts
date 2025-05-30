import { spawn } from "child_process"
import path from "path"
import fs from "fs"
import os from "os"
import { getQwenTensorEngine } from "./tensor-system/qwen-tensor-engine"

export class TensorLMStudioBridge {
  private lmStudioProcess: any = null
  private tensorScriptsPath: string
  private nvmePath: string
  private isRunning = false
  private qwenTensorEngine = getQwenTensorEngine()

  constructor() {
    this.tensorScriptsPath = process.env.TENSOR_SCRIPTS_PATH || path.join(process.cwd(), "tensor-scripts")
    this.nvmePath = process.env.AGENT_PATH || path.join(process.cwd(), "nvme_cache")
  }

  /**
   * Start LM Studio with tensor acceleration
   */
  async start(modelPath: string, config: any = {}): Promise<boolean> {
    if (this.isRunning) {
      console.log("TensorLMStudioBridge is already running")
      return true
    }

    try {
      // Validate model path exists
      if (!fs.existsSync(modelPath)) {
        throw new Error(`Model path does not exist: ${modelPath}`)
      }

      // Start the Qwen tensor engine
      const tensorStarted = await this.qwenTensorEngine.start(modelPath)
      if (!tensorStarted) {
        throw new Error("Failed to start Qwen tensor engine")
      }

      // Generate a configuration file for LM Studio
      const lmStudioConfigPath = await this.generateConfig(modelPath, config)

      // Check if LM Studio is installed and available
      try {
        const checkProcess = spawn("lm-studio", ["--version"])
        await new Promise<void>((resolve, reject) => {
          checkProcess.on("error", (error) => {
            reject(new Error(`LM Studio not found or not executable: ${error.message}`))
          })

          checkProcess.on("close", (code) => {
            if (code !== 0) {
              reject(new Error(`LM Studio check failed with code ${code}`))
            } else {
              resolve()
            }
          })

          // Set timeout for the check
          setTimeout(() => reject(new Error("LM Studio check timed out")), 5000)
        })
      } catch (error) {
        console.error("LM Studio check failed:", error)
        throw new Error(`LM Studio not available: ${error.message}`)
      }

      // Start LM Studio with the configuration
      this.lmStudioProcess = spawn("lm-studio", [
        "--config",
        lmStudioConfigPath,
        "--api-enabled",
        "--tensor-acceleration", // Custom flag we'd add to LM Studio
      ])

      // Monitor startup
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("LM Studio startup timed out after 30 seconds"))
        }, 30000)

        this.lmStudioProcess.stdout.on("data", (data: Buffer) => {
          const output = data.toString()
          console.log("[LM Studio]", output)

          if (output.includes("API server running")) {
            clearTimeout(timeout)
            this.isRunning = true
            resolve(true)
          }
        })

        this.lmStudioProcess.stderr.on("data", (data: Buffer) => {
          const error = data.toString()
          console.error("[LM Studio Error]", error)

          if (error.includes("Error:")) {
            clearTimeout(timeout)
            reject(new Error(`LM Studio error: ${error}`))
          }
        })

        this.lmStudioProcess.on("error", (error) => {
          clearTimeout(timeout)
          reject(new Error(`Failed to start LM Studio: ${error.message}`))
        })

        this.lmStudioProcess.on("close", (code) => {
          if (code !== 0 && this.isRunning === false) {
            clearTimeout(timeout)
            reject(new Error(`LM Studio process exited with code ${code}`))
          }
        })
      })
    } catch (error) {
      console.error("Failed to start integrated system:", error)
      // Clean up if tensor engine was started
      try {
        await this.qwenTensorEngine.stop()
      } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError)
      }
      throw error
    }
  }

  /**
   * Generate configuration for LM Studio
   */
  private async generateConfig(modelPath: string, userConfig: any): Promise<string> {
    const tensorStatus = this.qwenTensorEngine.getStatus()

    const config = {
      model: {
        path: modelPath,
        name: path.basename(modelPath),
        parameters: tensorStatus.model?.parameters || 7.62,
        contextLength: userConfig.contextLength || tensorStatus.context.maxLength || 1010000,
      },
      tensor: {
        enabled: true,
        primaryGpuLayers: tensorStatus.allocation.primaryGpu,
        secondaryGpuLayers: tensorStatus.allocation.secondaryGpu,
        cpuLayers: tensorStatus.allocation.cpu,
        ramLayers: tensorStatus.allocation.ram,
        nvmeLayers: tensorStatus.allocation.nvme,
        nvmePath: this.nvmePath,
      },
      inference: {
        threads: userConfig.threads || 8,
      },
      api: {
        enabled: true,
        port: userConfig.port || 1234,
      },
    }

    const configPath = path.join(os.tmpdir(), `lm_studio_tensor_${Date.now()}.json`)
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    return configPath
  }

  /**
   * Stop the integrated system
   */
  async stop(): Promise<boolean> {
    if (this.lmStudioProcess) {
      this.lmStudioProcess.kill()
    }

    // Stop the Qwen tensor engine
    await this.qwenTensorEngine.stop()

    this.isRunning = false
    return true
  }

  /**
   * Get status of the integrated system
   */
  async getStatus(): Promise<any> {
    if (!this.isRunning) {
      return { running: false }
    }

    try {
      // Get status from LM Studio API
      const lmStudioStatus = await fetch("http://localhost:1234/v1/status").then((r) => r.json())

      // Get status from Qwen tensor engine
      const tensorStatus = this.qwenTensorEngine.getStatus()

      // Combine the statuses
      return {
        running: true,
        model: {
          ...lmStudioStatus.model,
          ...tensorStatus.model,
        },
        inference: lmStudioStatus.inference,
        tensor: {
          allocation: tensorStatus.allocation,
          context: tensorStatus.context,
          hardware: tensorStatus.hardware,
        },
      }
    } catch (error) {
      console.error("Failed to get status:", error)
      return { running: this.isRunning, error: String(error) }
    }
  }
}
