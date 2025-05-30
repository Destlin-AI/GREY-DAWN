/**
 * Pure TypeScript implementation of tensor optimization system
 * No external script dependencies
 */

import { EventEmitter } from "events"
import { detectGPU, detectCPU, detectMemory } from "./hardware-detection"

// Hardware information interface
export interface HardwareInfo {
  gpu: {
    available: boolean
    count: number
    devices: Array<{
      id: number
      name: string
      totalMemory: number
      freeMemory: number
    }>
  }
  cpu: {
    cores: number
    threads: number
    usage: number
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
  gpu: number
  cpu: number
  ram: number
  nvme: number
  total: number
}

// Model information
export interface ModelInfo {
  name: string
  size: string // "7b", "13b", etc.
  category: "tiny" | "small" | "medium" | "large"
  hiddenSize: number
  numLayers: number
  vocabSize: number
}

// Tensor Engine class
export class TensorEngine extends EventEmitter {
  private isRunning = false
  private hardwareInfo: HardwareInfo | null = null
  private layerAllocation: LayerAllocation = { gpu: 0, cpu: 0, ram: 0, nvme: 0, total: 0 }
  private activeModel: ModelInfo | null = null
  private nvmePath = ""
  private updateInterval: NodeJS.Timeout | null = null
  private lastHardwareCheck = 0
  private hardwareCheckInterval = 5000 // 5 seconds

  constructor() {
    super()
    this.nvmePath = typeof window !== "undefined" ? localStorage.getItem("nvmePath") || "" : ""

    // Initialize with default values
    this.layerAllocation = { gpu: 0, cpu: 0, ram: 0, nvme: 0, total: 0 }
  }

  /**
   * Start the tensor engine
   */
  async start(modelName: string): Promise<boolean> {
    if (this.isRunning) {
      console.log("Tensor engine is already running")
      return true
    }

    try {
      // Detect hardware if we haven't already or if it's been a while
      if (!this.hardwareInfo || Date.now() - this.lastHardwareCheck > this.hardwareCheckInterval) {
        await this.detectHardware()
      }

      // Parse model info
      this.activeModel = this.parseModelInfo(modelName)

      // Calculate optimal layer allocation
      this.calculateOptimalAllocation()

      // Start monitoring
      this.startMonitoring()

      this.isRunning = true
      this.emit("started", { model: this.activeModel, allocation: this.layerAllocation })

      console.log(`Tensor engine started for model ${modelName}`)
      console.log(
        `Layer allocation: GPU=${this.layerAllocation.gpu}, CPU=${this.layerAllocation.cpu}, RAM=${this.layerAllocation.ram}, NVME=${this.layerAllocation.nvme}`,
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

      this.isRunning = false
      this.emit("stopped")

      console.log("Tensor engine stopped")

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
  } {
    return {
      isRunning: this.isRunning,
      model: this.activeModel,
      hardware: this.hardwareInfo,
      allocation: this.layerAllocation,
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
   * In browser environment, we can only do basic validation
   */
  private validatePath(path: string): boolean {
    if (!path) return false

    // In browser, we can only do basic validation
    if (typeof window !== "undefined") {
      // Check if path looks valid
      return /^([a-zA-Z]:\\|\/|\.\/|\.\.\/|~\/)/.test(path)
    }

    // In Node.js, we could check if the path exists and is writable
    // But for now, just return true if path is not empty
    return true
  }

  /**
   * Detect available hardware
   */
  async detectHardware(): Promise<HardwareInfo> {
    try {
      // GPU detection
      const gpuInfo = await detectGPU()

      // CPU detection
      const cpuInfo = detectCPU()

      // RAM detection
      const memoryInfo = detectMemory()

      // Convert memory from bytes to GB
      const totalRamGB = memoryInfo.total / (1024 * 1024 * 1024)
      const usedRamGB = memoryInfo.used / (1024 * 1024 * 1024)
      const freeRamGB = totalRamGB - usedRamGB
      const ramUsagePercent = (usedRamGB / totalRamGB) * 100

      // NVME detection (we can't detect this in browser, so we'll use the configured path)
      const nvmeAvailable = !!this.nvmePath
      const nvmePathExists = this.validatePath(this.nvmePath)

      // Build hardware info object
      this.hardwareInfo = {
        gpu: {
          available: gpuInfo.available,
          count: gpuInfo.available ? 1 : 0,
          devices: gpuInfo.available
            ? [
                {
                  id: 0,
                  name: gpuInfo.name,
                  totalMemory: gpuInfo.memory,
                  freeMemory: gpuInfo.memory * 0.7, // Assume 70% free
                },
              ]
            : [],
        },
        cpu: {
          cores: cpuInfo.cores,
          threads: cpuInfo.threads,
          usage: 30, // Default estimate
        },
        ram: {
          totalGB: totalRamGB,
          freeGB: freeRamGB,
          usagePercent: ramUsagePercent,
        },
        nvme: {
          available: nvmeAvailable,
          pathExists: nvmePathExists,
          totalGB: 500, // Default estimate
          freeGB: 250, // Default estimate
          usagePercent: 50,
        },
      }

      this.lastHardwareCheck = Date.now()
      this.emit("hardware-detected", this.hardwareInfo)

      return this.hardwareInfo
    } catch (error) {
      console.error("Error detecting hardware:", error)

      // Provide fallback values
      this.hardwareInfo = {
        gpu: {
          available: false,
          count: 0,
          devices: [],
        },
        cpu: {
          cores: 4,
          threads: 8,
          usage: 30,
        },
        ram: {
          totalGB: 8,
          freeGB: 4,
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
   * Parse model information from model name
   */
  private parseModelInfo(modelName: string): ModelInfo {
    // Extract size from model name (e.g., "llama-7b" -> "7b")
    const sizeMatch = modelName.match(/(\d+)b/i)
    const size = sizeMatch ? sizeMatch[1] + "b" : "unknown"

    // Determine category based on size
    let category: ModelInfo["category"] = "medium"
    const sizeNumber = Number.parseInt(sizeMatch?.[1] || "0", 10)

    if (sizeNumber <= 3) category = "tiny"
    else if (sizeNumber <= 13) category = "small"
    else if (sizeNumber <= 33) category = "medium"
    else category = "large"

    // Estimate model parameters based on size
    const hiddenSize = {
      tiny: 2048,
      small: 4096,
      medium: 5120,
      large: 8192,
    }[category]

    const numLayers = {
      tiny: 16,
      small: 32,
      medium: 40,
      large: 80,
    }[category]

    return {
      name: modelName,
      size,
      category,
      hiddenSize,
      numLayers,
      vocabSize: 32000,
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

    const { gpu, cpu, ram, nvme } = this.hardwareInfo
    const { category, numLayers } = this.activeModel

    // Default allocation
    let gpuLayers = 0
    let cpuLayers = 0
    let ramLayers = 0
    let nvmeLayers = 0

    // Allocate based on model category and available hardware
    if (gpu.available) {
      // GPU layers based on model size and available GPU memory
      const totalGpuMemoryGB = gpu.devices.reduce((sum, device) => sum + device.totalMemory / (1024 * 1024 * 1024), 0)

      // Estimate how many layers can fit in GPU memory
      // This is a very rough estimate and would need to be tuned
      const layerSizeGB = {
        tiny: 0.1,
        small: 0.2,
        medium: 0.5,
        large: 1.0,
      }[category]

      // Reserve 2GB for system and other operations
      const usableGpuMemoryGB = Math.max(0, totalGpuMemoryGB - 2)
      gpuLayers = Math.floor(usableGpuMemoryGB / layerSizeGB)

      // Cap GPU layers based on model category
      const maxGpuLayers = {
        tiny: numLayers, // All layers for tiny models
        small: Math.floor(numLayers / 2), // Half layers for small models
        medium: Math.floor(numLayers / 4), // Quarter layers for medium models
        large: Math.floor(numLayers / 8), // Eighth layers for large models
      }[category]

      gpuLayers = Math.min(gpuLayers, maxGpuLayers)
    }

    // CPU layers based on thread count
    cpuLayers = Math.min(cpu.threads, 16)

    // RAM layers based on available RAM
    const layerSizeRamGB = {
      tiny: 0.2,
      small: 0.4,
      medium: 1.0,
      large: 2.0,
    }[category]

    // Reserve 4GB for system
    const usableRamGB = Math.max(0, ram.freeGB - 4)
    ramLayers = Math.floor(usableRamGB / layerSizeRamGB)

    // NVME layers if available
    if (nvme.available && nvme.pathExists) {
      const layerSizeNvmeGB = {
        tiny: 0.2,
        small: 0.4,
        medium: 1.0,
        large: 2.0,
      }[category]

      // Reserve 10GB for system
      const usableNvmeGB = Math.max(0, nvme.freeGB - 10)
      nvmeLayers = Math.floor(usableNvmeGB / layerSizeNvmeGB)
    }

    // Ensure we have enough layers for the model
    const totalAllocatedLayers = gpuLayers + cpuLayers + ramLayers + nvmeLayers

    if (totalAllocatedLayers < numLayers) {
      // Not enough layers allocated, adjust
      const deficit = numLayers - totalAllocatedLayers

      // Try to allocate deficit to NVME first
      if (nvme.available && nvme.pathExists) {
        nvmeLayers += deficit
      } else {
        // Otherwise, try RAM
        ramLayers += deficit
      }
    }

    this.layerAllocation = {
      gpu: Math.max(0, Math.floor(gpuLayers)),
      cpu: Math.max(0, Math.floor(cpuLayers)),
      ram: Math.max(0, Math.floor(ramLayers)),
      nvme: Math.max(0, Math.floor(nvmeLayers)),
      total: numLayers,
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
      // In a browser environment, we can't get real-time hardware info
      // So we'll simulate some changes to make it look dynamic

      if (this.hardwareInfo.gpu.available) {
        this.hardwareInfo.gpu.devices.forEach((device) => {
          // Simulate some memory usage changes
          const usageChange = Math.random() * 0.1 - 0.05 // -5% to +5%
          const currentUsage = (device.totalMemory - device.freeMemory) / device.totalMemory
          const newUsage = Math.max(0.1, Math.min(0.9, currentUsage + usageChange))
          device.freeMemory = device.totalMemory * (1 - newUsage)
        })
      }

      // Simulate CPU usage changes
      this.hardwareInfo.cpu.usage = Math.min(100, Math.max(10, this.hardwareInfo.cpu.usage + (Math.random() * 10 - 5)))

      // Simulate RAM usage changes
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
   * Simulate tensor operations for a given model
   * This is a placeholder for actual tensor operations
   */
  async simulateInference(prompt: string, options: { maxTokens?: number } = {}): Promise<string> {
    if (!this.isRunning) {
      throw new Error("Tensor engine is not running")
    }

    const { maxTokens = 100 } = options

    // Simulate processing time based on model size and hardware
    const processingTimePerToken = this.estimateProcessingTime()
    const totalProcessingTime = processingTimePerToken * maxTokens

    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, totalProcessingTime))

    // Return a dummy response
    return `Simulated response for prompt: "${prompt.substring(0, 20)}..." (${maxTokens} tokens)`
  }

  /**
   * Estimate processing time per token based on model and hardware
   */
  private estimateProcessingTime(): number {
    if (!this.activeModel || !this.hardwareInfo) {
      return 100 // Default 100ms per token
    }

    // Base time depends on model size
    const baseTimeMs = {
      tiny: 10,
      small: 20,
      medium: 50,
      large: 100,
    }[this.activeModel.category]

    // Adjust based on hardware
    let speedFactor = 1.0

    // GPU acceleration
    if (this.hardwareInfo.gpu.available && this.layerAllocation.gpu > 0) {
      // More GPU layers = faster processing
      const gpuRatio = this.layerAllocation.gpu / this.layerAllocation.total
      speedFactor *= 1 - gpuRatio * 0.8 // Up to 80% reduction
    }

    // CPU factor
    const cpuFactor = Math.min(1, this.hardwareInfo.cpu.threads / 16) // Normalize to 16 threads
    speedFactor *= 1 - cpuFactor * 0.1 // Up to 10% reduction

    // Final time per token
    return Math.max(5, baseTimeMs * speedFactor)
  }
}

// Singleton instance
let tensorEngineInstance: TensorEngine | null = null

export function getTensorEngine(): TensorEngine {
  if (!tensorEngineInstance) {
    tensorEngineInstance = new TensorEngine()
  }
  return tensorEngineInstance
}
