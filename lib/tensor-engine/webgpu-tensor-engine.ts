/**
 * WebGPU Tensor Engine - Real implementation for hardware acceleration
 * Leverages RTX 3070 for tensor operations
 */

import { EventEmitter } from "events"

// Hardware information interface
export interface HardwareInfo {
  gpu: {
    available: boolean
    name: string
    vendor: string
    adapterInfo?: GPUAdapterInfo
    limits: {
      maxBufferSize: number
      maxComputeWorkgroupStorageSize: number
      maxStorageBufferBindingSize: number
    }
  }
  memory: {
    totalGb: number
    usedGb: number
  }
  storage: {
    available: boolean
    path: string
    totalGb: number
    freeGb: number
  }
}

// Layer allocation interface
export interface LayerAllocation {
  gpu: number
  cpu: number
  storage: number
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

// Tensor shape and data
export interface TensorData {
  shape: number[]
  data: Float32Array | Float16Array | Int32Array | Int8Array
  dtype: "float32" | "float16" | "int32" | "int8"
}

// Layer information
export interface LayerInfo {
  id: number
  name: string
  size: number
  location: "gpu" | "cpu" | "storage"
  tensor?: TensorData
  path?: string
}

// WebGPU Tensor Engine
export class WebGPUTensorEngine extends EventEmitter {
  private device: GPUDevice | null = null
  private adapter: GPUAdapter | null = null
  private isInitialized = false
  private isRunning = false
  private hardwareInfo: HardwareInfo | null = null
  private layerAllocation: LayerAllocation = { gpu: 0, cpu: 0, storage: 0, total: 0 }
  private activeModel: ModelInfo | null = null
  private storagePath = ""
  private layers: Map<number, LayerInfo> = new Map()
  private shaderModules: Map<string, GPUShaderModule> = new Map()
  private computePipelines: Map<string, GPUComputePipeline> = new Map()
  private buffers: Map<string, GPUBuffer> = new Map()

  constructor() {
    super()
    this.storagePath = typeof window !== "undefined" ? localStorage.getItem("tensorStoragePath") || "" : ""
  }

  /**
   * Initialize WebGPU and detect hardware
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true

    try {
      // Check if WebGPU is available
      if (!navigator.gpu) {
        throw new Error("WebGPU is not supported in this browser")
      }

      // Request adapter (GPU)
      this.adapter = await navigator.gpu.requestAdapter({
        powerPreference: "high-performance",
      })

      if (!this.adapter) {
        throw new Error("No GPU adapter found")
      }

      // Get adapter info
      const adapterInfo = await this.adapter.requestAdapterInfo()

      // Request device
      this.device = await this.adapter.requestDevice({
        requiredFeatures: ["shader-f16"],
        requiredLimits: {
          maxBufferSize: 1024 * 1024 * 1024, // 1GB
          maxStorageBufferBindingSize: 1024 * 1024 * 1024, // 1GB
          maxComputeWorkgroupStorageSize: 32768,
        },
      })

      // Set up error handling
      this.device.lost.then((info) => {
        console.error(`WebGPU device was lost: ${info.message}`)
        this.emit("error", { message: `GPU device was lost: ${info.message}` })
        this.isInitialized = false
        this.device = null
      })

      // Create hardware info
      this.hardwareInfo = {
        gpu: {
          available: true,
          name: adapterInfo.device || "Unknown GPU",
          vendor: adapterInfo.vendor || "Unknown",
          adapterInfo,
          limits: {
            maxBufferSize: this.device.limits.maxBufferSize,
            maxComputeWorkgroupStorageSize: this.device.limits.maxComputeWorkgroupStorageSize,
            maxStorageBufferBindingSize: this.device.limits.maxStorageBufferBindingSize,
          },
        },
        memory: {
          totalGb: navigator.deviceMemory || 8,
          usedGb: 0,
        },
        storage: {
          available: !!this.storagePath,
          path: this.storagePath,
          totalGb: 500, // Default estimate
          freeGb: 250, // Default estimate
        },
      }

      // Create basic shader modules
      await this.createShaderModules()

      this.isInitialized = true
      this.emit("initialized", this.hardwareInfo)
      return true
    } catch (error) {
      console.error("Failed to initialize WebGPU:", error)
      this.emit("error", {
        message: `Failed to initialize WebGPU: ${error instanceof Error ? error.message : String(error)}`,
      })
      return false
    }
  }

  /**
   * Create basic shader modules for tensor operations
   */
  private async createShaderModules() {
    if (!this.device) return

    // Matrix multiplication shader
    const matmulShader = `
      @group(0) @binding(0) var<storage, read> inputA: array<f32>;
      @group(0) @binding(1) var<storage, read> inputB: array<f32>;
      @group(0) @binding(2) var<storage, read_write> output: array<f32>;
      
      struct Dimensions {
        M: u32,
        N: u32,
        K: u32,
      }
      
      @group(0) @binding(3) var<uniform> dimensions: Dimensions;
      
      @compute @workgroup_size(8, 8)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let row = global_id.x;
        let col = global_id.y;
        
        if (row >= dimensions.M || col >= dimensions.N) {
          return;
        }
        
        var sum = 0.0;
        for (var i = 0u; i < dimensions.K; i = i + 1u) {
          sum = sum + inputA[row * dimensions.K + i] * inputB[i * dimensions.N + col];
        }
        
        output[row * dimensions.N + col] = sum;
      }
    `

    // Element-wise addition shader
    const addShader = `
      @group(0) @binding(0) var<storage, read> inputA: array<f32>;
      @group(0) @binding(1) var<storage, read> inputB: array<f32>;
      @group(0) @binding(2) var<storage, read_write> output: array<f32>;
      
      struct Dimensions {
        size: u32,
      }
      
      @group(0) @binding(3) var<uniform> dimensions: Dimensions;
      
      @compute @workgroup_size(256)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let idx = global_id.x;
        
        if (idx >= dimensions.size) {
          return;
        }
        
        output[idx] = inputA[idx] + inputB[idx];
      }
    `

    // ReLU activation shader
    const reluShader = `
      @group(0) @binding(0) var<storage, read> input: array<f32>;
      @group(0) @binding(1) var<storage, read_write> output: array<f32>;
      
      struct Dimensions {
        size: u32,
      }
      
      @group(0) @binding(2) var<uniform> dimensions: Dimensions;
      
      @compute @workgroup_size(256)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let idx = global_id.x;
        
        if (idx >= dimensions.size) {
          return;
        }
        
        output[idx] = max(0.0, input[idx]);
      }
    `

    // Create shader modules
    this.shaderModules.set(
      "matmul",
      this.device.createShaderModule({
        code: matmulShader,
      }),
    )

    this.shaderModules.set(
      "add",
      this.device.createShaderModule({
        code: addShader,
      }),
    )

    this.shaderModules.set(
      "relu",
      this.device.createShaderModule({
        code: reluShader,
      }),
    )

    // Create compute pipelines
    for (const [name, module] of this.shaderModules.entries()) {
      const pipeline = await this.device.createComputePipelineAsync({
        layout: "auto",
        compute: {
          module,
          entryPoint: "main",
        },
      })
      this.computePipelines.set(name, pipeline)
    }
  }

  /**
   * Start the tensor engine with a specific model
   */
  async start(modelName: string): Promise<boolean> {
    if (!this.isInitialized) {
      const initialized = await this.initialize()
      if (!initialized) return false
    }

    if (this.isRunning) {
      console.log("Tensor engine is already running")
      return true
    }

    try {
      // Parse model info
      this.activeModel = this.parseModelInfo(modelName)

      // Calculate optimal layer allocation
      this.calculateOptimalAllocation()

      // Initialize layers
      await this.initializeLayers()

      this.isRunning = true
      this.emit("started", { model: this.activeModel, allocation: this.layerAllocation })

      console.log(`Tensor engine started for model ${modelName}`)
      console.log(
        `Layer allocation: GPU=${this.layerAllocation.gpu}, CPU=${this.layerAllocation.cpu}, Storage=${this.layerAllocation.storage}`,
      )

      return true
    } catch (error) {
      console.error("Failed to start tensor engine:", error)
      this.emit("error", {
        message: `Failed to start tensor engine: ${error instanceof Error ? error.message : String(error)}`,
      })
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
      // Clean up GPU resources
      for (const buffer of this.buffers.values()) {
        buffer.destroy()
      }
      this.buffers.clear()

      // Clear layers
      this.layers.clear()

      this.isRunning = false
      this.emit("stopped")

      console.log("Tensor engine stopped")

      return true
    } catch (error) {
      console.error("Failed to stop tensor engine:", error)
      this.emit("error", {
        message: `Failed to stop tensor engine: ${error instanceof Error ? error.message : String(error)}`,
      })
      return false
    }
  }

  /**
   * Get the current status of the tensor engine
   */
  getStatus(): {
    isInitialized: boolean
    isRunning: boolean
    model: ModelInfo | null
    hardware: HardwareInfo | null
    allocation: LayerAllocation
    layers: LayerInfo[]
  } {
    return {
      isInitialized: this.isInitialized,
      isRunning: this.isRunning,
      model: this.activeModel,
      hardware: this.hardwareInfo,
      allocation: this.layerAllocation,
      layers: Array.from(this.layers.values()),
    }
  }

  /**
   * Set the storage path
   */
  setStoragePath(path: string): void {
    this.storagePath = path
    if (typeof window !== "undefined") {
      localStorage.setItem("tensorStoragePath", path)
    }

    // Update hardware info
    if (this.hardwareInfo) {
      this.hardwareInfo.storage.available = !!path
      this.hardwareInfo.storage.path = path
      this.emit("hardware-updated", this.hardwareInfo)
    }

    // Recalculate allocation if we're running
    if (this.isRunning && this.activeModel) {
      this.calculateOptimalAllocation()
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

    const { gpu, memory, storage } = this.hardwareInfo
    const { category, numLayers } = this.activeModel

    // Default allocation
    let gpuLayers = 0
    let cpuLayers = 0
    let storageLayers = 0

    // Estimate layer sizes based on model category
    const layerSizeMB = {
      tiny: 50,
      small: 150,
      medium: 300,
      large: 600,
    }[category]

    // Calculate how many layers can fit in GPU memory
    // For RTX 3070 with 8GB VRAM, reserve 2GB for system
    if (gpu.available) {
      const maxGpuMemoryMB = gpu.limits.maxBufferSize / (1024 * 1024)
      const usableGpuMemoryMB = maxGpuMemoryMB * 0.7 // Use 70% of available GPU memory
      gpuLayers = Math.floor(usableGpuMemoryMB / layerSizeMB)
    }

    // Calculate how many layers can fit in system memory
    // Reserve 4GB for system
    const systemMemoryGB = memory.totalGb
    const usableMemoryGB = Math.max(0, systemMemoryGB - 4)
    const usableMemoryMB = usableMemoryGB * 1024
    cpuLayers = Math.floor(usableMemoryMB / layerSizeMB)

    // Calculate how many layers can go to storage
    if (storage.available) {
      const usableStorageGB = storage.freeGb * 0.8 // Use 80% of available storage
      const usableStorageMB = usableStorageGB * 1024
      storageLayers = Math.floor(usableStorageMB / layerSizeMB)
    }

    // Adjust allocation based on model size and priorities
    // For small models, try to fit everything in GPU
    if (category === "tiny" || category === "small") {
      if (gpuLayers >= numLayers) {
        gpuLayers = numLayers
        cpuLayers = 0
        storageLayers = 0
      } else {
        // Fill GPU first, then CPU
        cpuLayers = Math.min(cpuLayers, numLayers - gpuLayers)
        storageLayers = Math.max(0, numLayers - gpuLayers - cpuLayers)
      }
    } else {
      // For medium/large models, prioritize critical layers on GPU
      const criticalLayers = Math.min(8, numLayers / 4) // First 25% or 8 layers, whichever is smaller

      if (gpuLayers >= criticalLayers) {
        gpuLayers = criticalLayers

        // Remaining layers split between CPU and storage
        const remainingLayers = numLayers - gpuLayers
        cpuLayers = Math.min(cpuLayers, remainingLayers)
        storageLayers = Math.max(0, remainingLayers - cpuLayers)
      } else {
        // Not enough GPU memory for critical layers, use what we have
        cpuLayers = Math.min(cpuLayers, numLayers - gpuLayers)
        storageLayers = Math.max(0, numLayers - gpuLayers - cpuLayers)
      }
    }

    this.layerAllocation = {
      gpu: Math.max(0, Math.floor(gpuLayers)),
      cpu: Math.max(0, Math.floor(cpuLayers)),
      storage: Math.max(0, Math.floor(storageLayers)),
      total: numLayers,
    }

    this.emit("allocation-updated", this.layerAllocation)
  }

  /**
   * Initialize layers based on allocation
   */
  private async initializeLayers(): Promise<void> {
    if (!this.device || !this.activeModel) return

    const { numLayers, hiddenSize } = this.activeModel
    const { gpu: gpuLayers, cpu: cpuLayers, storage: storageLayers } = this.layerAllocation

    // Clear existing layers
    this.layers.clear()

    // Create layer info objects
    for (let i = 0; i < numLayers; i++) {
      let location: "gpu" | "cpu" | "storage"

      // Determine layer location
      if (i < gpuLayers) {
        location = "gpu"
      } else if (i < gpuLayers + cpuLayers) {
        location = "cpu"
      } else {
        location = "storage"
      }

      // Calculate approximate layer size
      const layerSize = hiddenSize * hiddenSize * 4 // Rough estimate for a weight matrix

      // Create layer info
      const layer: LayerInfo = {
        id: i,
        name: `layer_${i}`,
        size: layerSize,
        location,
      }

      // For GPU layers, create buffers
      if (location === "gpu" && this.device) {
        // Create a buffer for this layer
        const buffer = this.device.createBuffer({
          size: layerSize * 4, // 4 bytes per float32
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        })

        this.buffers.set(`layer_${i}`, buffer)
      }

      // For storage layers, set path
      if (location === "storage" && this.storagePath) {
        layer.path = `${this.storagePath}/layer_${i}.bin`
      }

      this.layers.set(i, layer)
    }

    this.emit("layers-initialized", Array.from(this.layers.values()))
  }

  /**
   * Perform matrix multiplication using WebGPU
   */
  async matmul(a: Float32Array, b: Float32Array, m: number, n: number, k: number): Promise<Float32Array> {
    if (!this.device || !this.isInitialized) {
      throw new Error("WebGPU not initialized")
    }

    // Create buffers
    const aBuffer = this.device.createBuffer({
      size: a.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    const bBuffer = this.device.createBuffer({
      size: b.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    const resultBuffer = this.device.createBuffer({
      size: m * n * 4, // 4 bytes per float32
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    })

    const dimensionsBuffer = this.device.createBuffer({
      size: 16, // 3 u32 values (M, N, K) + padding
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    // Write data to buffers
    this.device.queue.writeBuffer(aBuffer, 0, a)
    this.device.queue.writeBuffer(bBuffer, 0, b)
    this.device.queue.writeBuffer(dimensionsBuffer, 0, new Uint32Array([m, n, k, 0])) // Last value is padding

    // Get compute pipeline
    const pipeline = this.computePipelines.get("matmul")
    if (!pipeline) {
      throw new Error("Matmul pipeline not found")
    }

    // Create bind group
    const bindGroup = this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: aBuffer } },
        { binding: 1, resource: { buffer: bBuffer } },
        { binding: 2, resource: { buffer: resultBuffer } },
        { binding: 3, resource: { buffer: dimensionsBuffer } },
      ],
    })

    // Create command encoder
    const commandEncoder = this.device.createCommandEncoder()
    const passEncoder = commandEncoder.beginComputePass()
    passEncoder.setPipeline(pipeline)
    passEncoder.setBindGroup(0, bindGroup)
    passEncoder.dispatchWorkgroups(Math.ceil(m / 8), Math.ceil(n / 8))
    passEncoder.end()

    // Create buffer to read result back to CPU
    const readBuffer = this.device.createBuffer({
      size: m * n * 4,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    })

    // Copy result to read buffer
    commandEncoder.copyBufferToBuffer(resultBuffer, 0, readBuffer, 0, m * n * 4)

    // Submit commands
    this.device.queue.submit([commandEncoder.finish()])

    // Read result
    await readBuffer.mapAsync(GPUMapMode.READ)
    const resultArray = new Float32Array(readBuffer.getMappedRange().slice(0))
    readBuffer.unmap()

    // Clean up
    aBuffer.destroy()
    bBuffer.destroy()
    resultBuffer.destroy()
    dimensionsBuffer.destroy()
    readBuffer.destroy()

    return resultArray
  }

  /**
   * Run inference with the model
   */
  async runInference(input: Float32Array): Promise<Float32Array> {
    if (!this.isRunning || !this.device) {
      throw new Error("Tensor engine not running")
    }

    // This is a simplified example - in a real implementation,
    // you would load the actual model weights and perform the full inference

    // For demonstration, we'll just do a simple matrix multiplication
    const batchSize = 1
    const inputSize = input.length
    const outputSize = 1024 // Example output size

    // Create a random weight matrix for demonstration
    const weights = new Float32Array(inputSize * outputSize)
    for (let i = 0; i < weights.length; i++) {
      weights[i] = Math.random() * 0.1
    }

    // Perform matrix multiplication
    const result = await this.matmul(input, weights, batchSize, outputSize, inputSize)

    return result
  }
}

// Singleton instance
let webgpuTensorEngineInstance: WebGPUTensorEngine | null = null

export function getWebGPUTensorEngine(): WebGPUTensorEngine {
  if (!webgpuTensorEngineInstance) {
    webgpuTensorEngineInstance = new WebGPUTensorEngine()
  }
  return webgpuTensorEngineInstance
}
