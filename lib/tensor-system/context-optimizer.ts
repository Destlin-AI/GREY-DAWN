/**
 * Context Optimizer for maximizing context length without degradation
 * Implements advanced KV cache management and sliding window attention
 * Now with NVME extended context support
 */

import { EventEmitter } from "events"
import { getNVMEContextManager, type NVMEContextManager } from "./nvme-context-manager"

export interface ContextConfig {
  maxLength: number // Maximum context length to support
  slidingWindowSize: number // Size of sliding attention window
  kvCacheStrategy: "unified" | "distributed" | "hierarchical"
  prefetchWindow: number // How many tokens to prefetch
  compressionLevel: number // 0-9, higher means more compression
  useNVMEExtension: boolean // Whether to use NVME for extended context
  nvmePath: string // Path to NVME storage
}

export class ContextOptimizer extends EventEmitter {
  private config: ContextConfig
  private currentContextLength = 0
  private kvCacheDistribution: Map<string, number> = new Map()
  private isInitialized = false
  private nvmeContextManager: NVMEContextManager
  private inMemoryContext: number[] = []
  private inMemoryContextCapacity = 0

  constructor(config?: Partial<ContextConfig>) {
    super()

    // Default configuration optimized for maximum context
    this.config = {
      maxLength: 1010000, // Target 1M tokens for Qwen2.5-7B-Instruct-1M
      slidingWindowSize: 8192,
      kvCacheStrategy: "hierarchical",
      prefetchWindow: 1024,
      compressionLevel: 6,
      useNVMEExtension: true,
      nvmePath: "",
      ...config,
    }

    this.nvmeContextManager = getNVMEContextManager({
      nvmePath: this.config.nvmePath,
      compressionLevel: this.config.compressionLevel,
      prefetchWindow: this.config.prefetchWindow,
    })
  }

  /**
   * Initialize the context optimizer
   */
  async initialize(): Promise<boolean> {
    try {
      // Calculate optimal KV cache distribution based on available hardware
      await this.calculateKVCacheDistribution()

      // Initialize sliding window attention
      this.initializeSlidingWindowAttention()

      // Setup prefetching
      this.setupPrefetching()

      // Initialize NVME context manager if enabled
      if (this.config.useNVMEExtension && this.config.nvmePath) {
        const nvmeInitialized = await this.nvmeContextManager.initialize(this.config.nvmePath)
        if (!nvmeInitialized) {
          console.warn("Failed to initialize NVME context manager, falling back to in-memory only")
          this.config.useNVMEExtension = false
        }
      }

      this.isInitialized = true
      this.emit("initialized", {
        maxContextLength: this.config.maxLength,
        useNVMEExtension: this.config.useNVMEExtension,
      })
      return true
    } catch (error) {
      console.error("Failed to initialize context optimizer:", error)
      this.emit("error", { message: "Failed to initialize context optimizer", error })
      return false
    }
  }

  /**
   * Set NVME path
   */
  async setNVMEPath(nvmePath: string): Promise<boolean> {
    this.config.nvmePath = nvmePath

    if (this.isInitialized && this.config.useNVMEExtension) {
      return await this.nvmeContextManager.initialize(nvmePath)
    }

    return true
  }

  /**
   * Calculate optimal KV cache distribution across hardware
   */
  private async calculateKVCacheDistribution(): Promise<void> {
    // Get available hardware resources
    const gpuMemory = await this.getAvailableGPUMemory()
    const systemMemory = await this.getAvailableSystemMemory()
    const nvmeSpace = await this.getAvailableNVMESpace()

    // Calculate token capacity per hardware type
    // Each token in KV cache requires approximately:
    // - 2 * hidden_size * 2 (K and V) * bytes_per_element
    // For Qwen2.5-7B with hidden_size=4096, fp16 precision: ~32KB per token
    const bytesPerToken = 4096 * 2 * 2 * 2 // hidden_size * 2 heads * K&V * bytes_per_element

    // Reserve 10% for operational overhead
    const gpuCapacity = Math.floor((gpuMemory * 0.9) / bytesPerToken)
    const ramCapacity = Math.floor((systemMemory * 0.9) / bytesPerToken)
    const nvmeCapacity = this.config.useNVMEExtension ? Math.floor((nvmeSpace * 0.9) / bytesPerToken) : 0

    // Distribute KV cache based on hardware speed
    // Prioritize GPU > RAM > NVME
    const totalCapacity = gpuCapacity + ramCapacity + nvmeCapacity

    // Ensure we can handle the requested context length
    if (totalCapacity < this.config.maxLength) {
      console.warn(
        `Warning: Available hardware can only support ${totalCapacity} tokens, less than requested ${this.config.maxLength}`,
      )
      this.config.maxLength = totalCapacity
    }

    // Distribute KV cache
    this.kvCacheDistribution.set("gpu", Math.min(gpuCapacity, this.config.maxLength))

    const remainingAfterGPU = this.config.maxLength - gpuCapacity
    if (remainingAfterGPU > 0) {
      this.kvCacheDistribution.set("ram", Math.min(ramCapacity, remainingAfterGPU))

      const remainingAfterRAM = remainingAfterGPU - ramCapacity
      if (remainingAfterRAM > 0 && this.config.useNVMEExtension) {
        this.kvCacheDistribution.set("nvme", Math.min(nvmeCapacity, remainingAfterRAM))
      }
    }

    // Set in-memory context capacity
    this.inMemoryContextCapacity = gpuCapacity + ramCapacity

    console.log("KV Cache Distribution:", Object.fromEntries(this.kvCacheDistribution))
  }

  /**
   * Initialize sliding window attention for efficient long context processing
   */
  private initializeSlidingWindowAttention(): void {
    // In a real implementation, this would configure the attention mechanism
    // to use sliding windows for efficient processing of long contexts
    console.log(`Initializing sliding window attention with window size ${this.config.slidingWindowSize}`)
  }

  /**
   * Setup prefetching for context windows
   */
  private setupPrefetching(): void {
    // In a real implementation, this would set up a prefetching system
    // to load context windows before they're needed
    console.log(`Setting up prefetching with window size ${this.config.prefetchWindow}`)
  }

  /**
   * Get available GPU memory across all GPUs
   */
  private async getAvailableGPUMemory(): Promise<number> {
    // In a real implementation, this would query the GPU
    // For now, return a conservative estimate for RTX 3070 (8GB) and Quadro P2200 (5GB)
    return 13 * 1024 * 1024 * 1024 // 13GB in bytes
  }

  /**
   * Get available system memory
   */
  private async getAvailableSystemMemory(): Promise<number> {
    // In a real implementation, this would query the system
    // For now, return a conservative estimate (16GB)
    return 16 * 1024 * 1024 * 1024 // 16GB in bytes
  }

  /**
   * Get available NVME space
   */
  private async getAvailableNVMESpace(): Promise<number> {
    // In a real implementation, this would query the NVME
    // For now, return a conservative estimate (100GB)
    return 100 * 1024 * 1024 * 1024 // 100GB in bytes
  }

  /**
   * Process a batch of tokens through the context optimizer
   */
  async processTokens(tokens: number[], position: number): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("Context optimizer not initialized")
    }

    // Update current context length
    this.currentContextLength = Math.max(this.currentContextLength, position + tokens.length)

    // Determine if we need to use NVME extension
    const useNVME = this.config.useNVMEExtension && position + tokens.length > this.inMemoryContextCapacity

    if (useNVME) {
      // Store tokens in NVME context manager
      await this.nvmeContextManager.storeTokens(tokens, position)

      // Also keep recent tokens in memory for faster access
      if (position < this.inMemoryContextCapacity) {
        // Calculate how many tokens fit in memory
        const tokensInMemory = Math.min(tokens.length, this.inMemoryContextCapacity - position)

        // Ensure in-memory context array is large enough
        if (this.inMemoryContext.length < position + tokensInMemory) {
          this.inMemoryContext.length = position + tokensInMemory
        }

        // Store tokens in memory
        for (let i = 0; i < tokensInMemory; i++) {
          this.inMemoryContext[position + i] = tokens[i]
        }
      }
    } else {
      // Store tokens in memory only
      // Ensure in-memory context array is large enough
      if (this.inMemoryContext.length < position + tokens.length) {
        this.inMemoryContext.length = position + tokens.length
      }

      // Store tokens in memory
      for (let i = 0; i < tokens.length; i++) {
        this.inMemoryContext[position + i] = tokens[i]
      }
    }

    // Emit progress event
    this.emit("progress", {
      currentLength: this.currentContextLength,
      maxLength: this.config.maxLength,
      percentUsed: (this.currentContextLength / this.config.maxLength) * 100,
      usingNVME: useNVME,
    })
  }

  /**
   * Retrieve tokens from the context
   */
  async retrieveTokens(startPosition: number, length: number): Promise<number[]> {
    if (!this.isInitialized) {
      throw new Error("Context optimizer not initialized")
    }

    // Ensure we're not requesting beyond the stored tokens
    if (startPosition + length > this.currentContextLength) {
      length = Math.max(0, this.currentContextLength - startPosition)
    }

    if (length === 0) {
      return []
    }

    // Determine if we need to use NVME extension
    const useNVME =
      this.config.useNVMEExtension &&
      (startPosition >= this.inMemoryContextCapacity || startPosition + length > this.inMemoryContextCapacity)

    if (useNVME) {
      // Retrieve tokens from NVME context manager
      return await this.nvmeContextManager.retrieveTokens(startPosition, length)
    } else {
      // Retrieve tokens from memory
      return this.inMemoryContext.slice(startPosition, startPosition + length)
    }
  }

  /**
   * Get the current context status
   */
  getStatus(): {
    currentLength: number
    maxLength: number
    kvCacheDistribution: Record<string, number>
    isInitialized: boolean
    useNVMEExtension: boolean
    nvmeStatus: {
      isInitialized: boolean
      totalTokens: number
      cachedChunks: number
      nvmePath: string
      contextDir: string
    } | null
  } {
    return {
      currentLength: this.currentContextLength,
      maxLength: this.config.maxLength,
      kvCacheDistribution: Object.fromEntries(this.kvCacheDistribution),
      isInitialized: this.isInitialized,
      useNVMEExtension: this.config.useNVMEExtension,
      nvmeStatus: this.config.useNVMEExtension ? this.nvmeContextManager.getStatus() : null,
    }
  }

  /**
   * Reset the context
   */
  async reset(): Promise<void> {
    this.currentContextLength = 0
    this.inMemoryContext = []

    if (this.config.useNVMEExtension) {
      await this.nvmeContextManager.reset()
    }

    this.emit("reset")
  }
}

// Singleton instance
let contextOptimizerInstance: ContextOptimizer | null = null

export function getContextOptimizer(config?: Partial<ContextConfig>): ContextOptimizer {
  if (!contextOptimizerInstance) {
    contextOptimizerInstance = new ContextOptimizer(config)
  }
  return contextOptimizerInstance
}
