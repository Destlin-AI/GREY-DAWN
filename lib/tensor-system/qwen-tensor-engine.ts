/**
 * Specialized tensor engine for Qwen2.5-7B-Instruct-1M
 * Optimized for maximum context length without degradation
 */

import { EventEmitter } from "events"
import fs from "fs"
import { getContextOptimizer, type ContextOptimizer } from "./context-optimizer"

// Hardware information interface
export interface HardwareInfo {
  gpus: Array<{
    id: number
    name: string
    totalMemory: number
    freeMemory: number
  }>
  cpu: {
    cores: number
    threads: number
    usage: number
    numaNodes: number
  }
  ram: {
    totalGB: number
    freeGB: number
    usagePercent: number
  }
  nvme: {
    available: boolean
    pathExists: boolean
    totalGB: number
    freeGB: number
    usagePercent: number
  }
}

// Layer allocation interface
export interface LayerAllocation {
  primaryGpu: number
  secondaryGpu: number
  cpu: number
  ram: number
  nvme: number
  total: number
  layerMap: Record<number, string>
}

// Model information
export interface ModelInfo {
  name: string
  size: string
  parameters: number
  hiddenSize: number
  numLayers: number
  numAttentionHeads: number
  kvHeads: number
  vocabSize: number
  maxContextLength: number
}

// Qwen Tensor Engine class
export class QwenTensorEngine extends EventEmitter {
  private isRunning = false
  private hardwareInfo: HardwareInfo | null = null
  private layerAllocation: LayerAllocation = {
    primaryGpu: 0,
    secondaryGpu: 0,
    cpu: 0,
    ram: 0,
    nvme: 0,
    total: 0,
    layerMap: {},
  }
  private activeModel: ModelInfo | null = null
  private nvmePath = ""
  private updateInterval: NodeJS.Timeout | null = null
  private lastHardwareCheck = 0
  private hardwareCheckInterval = 5000 // 5 seconds
  private contextOptimizer: ContextOptimizer

  constructor() {
    super()
    this.nvmePath = typeof window !== "undefined" ? localStorage.getItem("nvmePath") || "" : ""
    this.contextOptimizer = getContextOptimizer()

    // Initialize with default values
    this.layerAllocation = {
      primaryGpu: 0,
      secondaryGpu: 0,
      cpu: 0,
      ram: 0,
      nvme: 0,
      total: 0,
      layerMap: {},
    }
  }

  /**
   * Start the tensor engine
   */
  async start(modelPath: string): Promise<boolean> {
    if (this.isRunning) {
      console.log("Tensor engine is already running")
      return true
    }

    try {
      // Detect hardware if we haven't already or if it's been a while
      if (!this.hardwareInfo || Date.now() - this.lastHardwareCheck > this.hardwareCheckInterval) {
        await this.detectHardware()
      }

      // Parse model info from path
      this.activeModel = this.parseModelInfo(modelPath)

      // Initialize context optimizer
      await this.contextOptimizer.initialize()

      // Calculate optimal layer allocation
      this.calculateOptimalAllocation()

      // Start monitoring
      this.startMonitoring()

      this.isRunning = true
      this.emit("started", {
        model: this.activeModel,
        allocation: this.layerAllocation,
        contextLength: this.contextOptimizer.getStatus().maxLength,
      })

      console.log(`Qwen tensor engine started for model ${modelPath}`)
      console.log(
        `Layer allocation: Primary GPU=${this.layerAllocation.primaryGpu}, Secondary GPU=${this.layerAllocation.secondaryGpu}, ` +
          `CPU=${this.layerAllocation.cpu}, RAM=${this.layerAllocation.ram}, NVME=${this.layerAllocation.nvme}`,
      )

      return true
    } catch (error) {
      console.error("Failed to start tensor engine:", error)
      this.emit("error", { message: "Failed to start tensor engine", error })
      return false
    }
  }

  /**
   * Stop the tensor engine
   */
  async stop(): Promise<boolean> {
    if (!this.isRunning) {
      return true
    }

    try {
      // Stop monitoring
      if (this.updateInterval) {
        clearInterval(this.updateInterval)
        this.updateInterval = null
      }

      // Reset context optimizer
      this.contextOptimizer.reset()

      this.isRunning = false
      this.emit("stopped")

      console.log("Qwen tensor engine stopped")

      return true
    } catch (error) {
      console.error("Failed to stop tensor engine:", error)
      this.emit("error", { message: "Failed to stop tensor engine", error })
      return false
    }
  }

  /**
   * Get the current status of the tensor engine
   */
  getStatus(): {
    isRunning: boolean
    model: ModelInfo | null
    hardware: HardwareInfo | null
    allocation: LayerAllocation
    context: {
      currentLength: number
      maxLength: number
      percentUsed: number
    }
  } {
    const contextStatus = this.contextOptimizer.getStatus()

    return {
      isRunning: this.isRunning,
      model: this.activeModel,
      hardware: this.hardwareInfo,
      allocation: this.layerAllocation,
      context: {
        currentLength: contextStatus.currentLength,
        maxLength: contextStatus.maxLength,
        percentUsed: (contextStatus.currentLength / contextStatus.maxLength) * 100,
      },
    }
  }

  /**
   * Set the NVME path
   */
  setNvmePath(path: string): void {
    this.nvmePath = path
    if (typeof window !== "undefined") {
      localStorage.setItem("nvmePath", path)
    }

    // Update NVME availability in hardware info
    if (this.hardwareInfo && this.hardwareInfo.nvme) {
      this.hardwareInfo.nvme.available = !!path
      this.hardwareInfo.nvme.pathExists = !!path && this.validatePath(path)

      // Recalculate allocation if we're running
      if (this.isRunning && this.activeModel) {
        this.calculateOptimalAllocation()
      }

      this.emit("hardware-updated", this.hardwareInfo)
    }
  }

  /**
   * Validate if a path exists and is writable
   */
  private validatePath(path: string): boolean {
    if (!path) return false

    // In browser, we can only do basic validation
    if (typeof window !== "undefined") {
      // Check if path looks valid
      return /^([a-zA-Z]:\\|\/|\.\/|\.\.\/|~\/)/.test(path)
    }

    // In Node.js, check if the path exists and is writable
    try {
      fs.accessSync(path, fs.constants.W_OK)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Detect available hardware
   */
  async detectHardware(): Promise<HardwareInfo> {
    try {
      // In a real implementation, this would detect actual hardware
      // For now, we'll use mock data based on the user's described setup

      // Two GPUs: RTX 3070 (8GB) and Quadro P2200 (5GB)
      const gpus = [
        {
          id: 0,
          name: "NVIDIA GeForce RTX 3070",
          totalMemory: 8 * 1024 * 1024 * 1024, // 8GB
          freeMemory: 7 * 1024 * 1024 * 1024, // 7GB free
        },
        {
          id: 1,
          name: "NVIDIA Quadro P2200",
          totalMemory: 5 * 1024 * 1024 * 1024, // 5GB
          freeMemory: 4.5 * 1024 * 1024 * 1024, // 4.5GB free
        },
      ]

      // CPU with multiple cores
      const cpu = {
        cores: 8,
        threads: 16,
        usage: 30,
        numaNodes: 1,
      }

      // RAM
      const ram = {
        totalGB: 32,
        freeGB: 24,
        usagePercent: 25,
      }

      // NVME
      const nvme = {
        available: !!this.nvmePath,
        pathExists: !!this.nvmePath && this.validatePath(this.nvmePath),
        totalGB: 500,
        freeGB: 300,
        usagePercent: 40,
      }

      this.hardwareInfo = {
        gpus,
        cpu,
        ram,
        nvme,
      }

      this.lastHardwareCheck = Date.now()
      this.emit("hardware-detected", this.hardwareInfo)

      return this.hardwareInfo
    } catch (error) {
      console.error("Error detecting hardware:", error)

      // Provide fallback values
      this.hardwareInfo = {
        gpus: [
          {
            id: 0,
            name: "Unknown GPU",
            totalMemory: 8 * 1024 * 1024 * 1024,
            freeMemory: 6 * 1024 * 1024 * 1024,
          },
        ],
        cpu: {
          cores: 4,
          threads: 8,
          usage: 30,
          numaNodes: 1,
        },
        ram: {
          totalGB: 16,
          freeGB: 8,
          usagePercent: 50,
        },
        nvme: {
          available: !!this.nvmePath,
          pathExists: !!this.nvmePath,
          totalGB: 500,
          freeGB: 250,
          usagePercent: 50,
        },
      }

      this.lastHardwareCheck = Date.now()
      this.emit("hardware-detected", this.hardwareInfo)
      this.emit("error", { message: "Error detecting hardware", error })

      return this.hardwareInfo
    }
  }

  /**
   * Parse model information from model path
   */
  private parseModelInfo(modelPath: string): ModelInfo {
    // Extract model name from path
    const pathParts = modelPath.split(/[/\\]/)
    const fileName = pathParts[pathParts.length - 1]

    // For Qwen2.5-7B-Instruct-1M
    return {
      name: "Qwen2.5-7B-Instruct-1M",
      size: "7B",
      parameters: 7.62,
      hiddenSize: 4096,
      numLayers: 28,
      numAttentionHeads: 28,
      kvHeads: 4,
      vocabSize: 152064,
      maxContextLength: 1010000, // 1M context length
    }
  }

  /**
   * Calculate optimal layer allocation based on hardware and model
   */
  private calculateOptimalAllocation(): void {
    if (!this.hardwareInfo || !this.activeModel) {
      console.error("Hardware info or active model not available")
      return
    }

    const { gpus, cpu, ram, nvme } = this.hardwareInfo
    const { numLayers } = this.activeModel

    // Reset layer allocation
    this.layerAllocation = {
      primaryGpu: 0,
      secondaryGpu: 0,
      cpu: 0,
      ram: 0,
      nvme: 0,
      total: numLayers,
      layerMap: {},
    }

    // Calculate layer sizes
    // For Qwen2.5-7B, each layer is approximately:
    // - Attention layer: ~150MB
    // - Feed-forward layer: ~300MB
    const layerSizeMB = 450 // Total per layer

    // Calculate how many layers can fit in each GPU
    const primaryGpuLayerCount = Math.min(numLayers, Math.floor(gpus[0].freeMemory / (1024 * 1024) / layerSizeMB))

    // For the 7B model, we might be able to fit all layers in the primary GPU
    // But we'll still calculate for all hardware to be safe
    const remainingLayers = numLayers - primaryGpuLayerCount

    let secondaryGpuLayerCount = 0
    let cpuLayerCount = 0
    let ramLayerCount = 0
    let nvmeLayerCount = 0

    if (remainingLayers > 0) {
      // Calculate secondary GPU layers
      secondaryGpuLayerCount = Math.min(remainingLayers, Math.floor(gpus[1].freeMemory / (1024 * 1024) / layerSizeMB))

      const afterGpuLayers = remainingLayers - secondaryGpuLayerCount

      if (afterGpuLayers > 0) {
        // Calculate CPU layers
        cpuLayerCount = Math.min(
          afterGpuLayers,
          Math.min(cpu.threads, 8), // Limit to 8 layers on CPU
        )

        const afterCpuLayers = afterGpuLayers - cpuLayerCount

        if (afterCpuLayers > 0) {
          // Calculate RAM layers
          const ramLayerSizeMB = layerSizeMB * 2 // RAM layers are typically 2x the size due to precision
          ramLayerCount = Math.min(afterCpuLayers, Math.floor((ram.freeGB * 1024) / ramLayerSizeMB))

          // Remaining layers go to NVME
          nvmeLayerCount = afterCpuLayers - ramLayerCount
        }
      }
    }

    // Update layer allocation
    this.layerAllocation.primaryGpu = primaryGpuLayerCount
    this.layerAllocation.secondaryGpu = secondaryGpuLayerCount
    this.layerAllocation.cpu = cpuLayerCount
    this.layerAllocation.ram = ramLayerCount
    this.layerAllocation.nvme = nvmeLayerCount
    this.layerAllocation.total = numLayers

    // Create layer map
    // We'll allocate layers in order of hardware speed:
    // 1. Primary GPU (fastest)
    // 2. Secondary GPU
    // 3. CPU
    // 4. RAM
    // 5. NVME (slowest)

    // For Qwen, we want to prioritize attention layers on the fastest hardware
    // Attention layers are typically more critical for performance

    // Allocate layers to primary GPU (prioritize early layers which are more critical)
    for (let i = 0; i < primaryGpuLayerCount; i++) {
      this.layerAllocation.layerMap[i] = "primary-gpu"
    }

    // Allocate layers to secondary GPU
    for (let i = 0; i < secondaryGpuLayerCount; i++) {
      this.layerAllocation.layerMap[primaryGpuLayerCount + i] = "secondary-gpu"
    }

    // Allocate layers to CPU
    for (let i = 0; i < cpuLayerCount; i++) {
      this.layerAllocation.layerMap[primaryGpuLayerCount + secondaryGpuLayerCount + i] = "cpu"
    }

    // Allocate layers to RAM
    for (let i = 0; i < ramLayerCount; i++) {
      this.layerAllocation.layerMap[primaryGpuLayerCount + secondaryGpuLayerCount + cpuLayerCount + i] = "ram"
    }

    // Allocate remaining layers to NVME
    for (let i = 0; i < nvmeLayerCount; i++) {
      this.layerAllocation.layerMap[primaryGpuLayerCount + secondaryGpuLayerCount + cpuLayerCount + ramLayerCount + i] =
        "nvme"
    }

    this.emit("allocation-updated", this.layerAllocation)
  }

  /**
   * Start monitoring hardware usage
   */
  private startMonitoring(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }

    this.updateInterval = setInterval(() => {
      this.updateHardwareUsage()
    }, 5000)
  }

  /**
   * Update hardware usage information
   */
  private async updateHardwareUsage(): Promise<void> {
    if (!this.hardwareInfo) return

    try {
      // In a real implementation, this would query actual hardware usage
      // For now, we'll simulate some changes

      // Update GPU usage
      this.hardwareInfo.gpus.forEach((gpu, index) => {
        const usageChange = Math.random() * 0.1 - 0.05 // -5% to +5%
        const currentUsage = (gpu.totalMemory - gpu.freeMemory) / gpu.totalMemory
        const newUsage = Math.max(0.1, Math.min(0.9, currentUsage + usageChange))
        gpu.freeMemory = gpu.totalMemory * (1 - newUsage)
      })

      // Update CPU usage
      this.hardwareInfo.cpu.usage = Math.min(100, Math.max(10, this.hardwareInfo.cpu.usage + (Math.random() * 10 - 5)))

      // Update RAM usage
      const ramUsageChange = Math.random() * 0.05 - 0.025 // -2.5% to +2.5%
      this.hardwareInfo.ram.usagePercent = Math.min(
        95,
        Math.max(20, this.hardwareInfo.ram.usagePercent + ramUsageChange * 100),
      )
      this.hardwareInfo.ram.freeGB = this.hardwareInfo.ram.totalGB * (1 - this.hardwareInfo.ram.usagePercent / 100)

      this.emit("hardware-updated", this.hardwareInfo)
    } catch (error) {
      console.error("Error updating hardware usage:", error)
      this.emit("error", { message: "Error updating hardware usage", error })
    }
  }

  /**
   * Process a batch of tokens
   */
  async processTokens(tokens: number[], position: number): Promise<void> {
    if (!this.isRunning) {
      throw new Error("Tensor engine not running")
    }

    // Forward to context optimizer
    await this.contextOptimizer.processTokens(tokens, position)
  }
}

// Singleton instance
let qwenTensorEngineInstance: QwenTensorEngine | null = null

export function getQwenTensorEngine(): QwenTensorEngine {
  if (!qwenTensorEngineInstance) {
    qwenTensorEngineInstance = new QwenTensorEngine()
  }
  return qwenTensorEngineInstance
}
