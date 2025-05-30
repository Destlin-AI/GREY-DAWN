import { EventEmitter } from "events"
import type { HardwareInfo } from "./hardware-detection"

interface TensorEngineOptions {
  storagePath?: string
  maxMemoryUsage?: number
}

export class WebGPUTensorEngine extends EventEmitter {
  private device: GPUDevice | null = null
  private adapter: GPUAdapter | null = null
  private isInitialized = false
  private storagePath: string | null = null
  private maxMemoryUsage = 0.8 // Default to 80% of available memory
  private hardwareInfo: HardwareInfo | null = null

  // Matrix multiplication function type
  private matmul: ((a: Float32Array, b: Float32Array, m: number, n: number, k: number) => Float32Array) | null = null

  // CPU fallback implementation
  private matmulCPU: ((a: Float32Array, b: Float32Array, m: number, n: number, k: number) => Float32Array) | null = null

  constructor(options?: TensorEngineOptions) {
    super()

    if (options) {
      if (options.storagePath) {
        this.storagePath = options.storagePath
      }

      if (options.maxMemoryUsage) {
        this.maxMemoryUsage = Math.min(Math.max(0.1, options.maxMemoryUsage), 0.95)
      }
    }
  }

  /**
   * Initialize WebGPU and detect hardware
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true

    try {
      // Check if WebGPU is available
      if (typeof navigator === "undefined" || !navigator.gpu) {
        console.warn("WebGPU is not supported in this browser, falling back to CPU")
        this.emit("warning", { message: "WebGPU not supported, falling back to CPU" })

        // Set up CPU fallback
        this.setupCPUFallback()

        this.isInitialized = true
        this.hardwareInfo = {
          gpu: {
            available: false,
            name: "CPU Fallback",
            vendor: "CPU",
            limits: {
              maxBufferSize: 1024 * 1024 * 1024, // 1GB
              maxComputeWorkgroupStorageSize: 32768,
              maxStorageBufferBindingSize: 1024 * 1024 * 1024, // 1GB
            },
          },
          memory: {
            totalGb: typeof navigator !== "undefined" && navigator.deviceMemory ? navigator.deviceMemory : 8,
            usedGb: 0,
          },
          storage: {
            available: !!this.storagePath,
            path: this.storagePath || "",
            totalGb: 500, // Default estimate
            freeGb: 250, // Default estimate
          },
        }

        this.emit("initialized", this.hardwareInfo)
        return true
      }

      // Request adapter
      this.adapter = await navigator.gpu.requestAdapter({
        powerPreference: "high-performance",
      })

      if (!this.adapter) {
        throw new Error("Failed to get GPU adapter")
      }

      // Request device
      this.device = await this.adapter.requestDevice({
        requiredFeatures: ["timestamp-query", "bgra8unorm-storage"],
        requiredLimits: {
          maxBufferSize: 1024 * 1024 * 1024, // 1GB
        },
      })

      if (!this.device) {
        throw new Error("Failed to get GPU device")
      }

      // Set up error handling
      this.device.addEventListener("uncapturederror", (event) => {
        console.error("WebGPU error:", event.error)
        this.emit("error", { message: `WebGPU error: ${event.error}` })
      })

      // Initialize matrix multiplication
      await this.initializeMatMul()

      // Get hardware info
      const adapterInfo = await this.adapter.requestAdapterInfo()

      this.hardwareInfo = {
        gpu: {
          available: true,
          name: adapterInfo.device || "Unknown GPU",
          vendor: adapterInfo.vendor || "Unknown Vendor",
          limits: {
            maxBufferSize: this.device.limits.maxBufferSize,
            maxComputeWorkgroupStorageSize: this.device.limits.maxComputeWorkgroupStorageSize,
            maxStorageBufferBindingSize: this.device.limits.maxStorageBufferBindingSize,
          },
        },
        memory: {
          totalGb: typeof navigator !== "undefined" && navigator.deviceMemory ? navigator.deviceMemory : 8,
          usedGb: 0,
        },
        storage: {
          available: !!this.storagePath,
          path: this.storagePath || "",
          totalGb: 500, // Default estimate
          freeGb: 250, // Default estimate
        },
      }

      this.isInitialized = true
      this.emit("initialized", this.hardwareInfo)
      return true
    } catch (error) {
      console.error("Failed to initialize WebGPU:", error)
      this.emit("error", {
        message: `Failed to initialize WebGPU: ${error instanceof Error ? error.message : String(error)}`,
      })

      // Try CPU fallback on error
      try {
        console.warn("WebGPU initialization failed, falling back to CPU")
        this.setupCPUFallback()
        this.isInitialized = true

        this.hardwareInfo = {
          gpu: {
            available: false,
            name: "CPU Fallback (Error Recovery)",
            vendor: "CPU",
            limits: {
              maxBufferSize: 1024 * 1024 * 1024, // 1GB
              maxComputeWorkgroupStorageSize: 32768,
              maxStorageBufferBindingSize: 1024 * 1024 * 1024, // 1GB
            },
          },
          memory: {
            totalGb: typeof navigator !== "undefined" && navigator.deviceMemory ? navigator.deviceMemory : 8,
            usedGb: 0,
          },
          storage: {
            available: !!this.storagePath,
            path: this.storagePath || "",
            totalGb: 500, // Default estimate
            freeGb: 250, // Default estimate
          },
        }

        this.emit("initialized", this.hardwareInfo)
        return true
      } catch (fallbackError) {
        console.error("CPU fallback also failed:", fallbackError)
        return false
      }
    }
  }

  /**
   * Set up CPU fallback for tensor operations
   */
  private setupCPUFallback(): void {
    // Create CPU implementations of tensor operations
    this.matmulCPU = (a: Float32Array, b: Float32Array, m: number, n: number, k: number): Float32Array => {
      const result = new Float32Array(m * n)

      for (let row = 0; row < m; row++) {
        for (let col = 0; col < n; col++) {
          let sum = 0
          for (let i = 0; i < k; i++) {
            sum += a[row * k + i] * b[i * n + col]
          }
          result[row * n + col] = sum
        }
      }

      return result
    }

    // Override the GPU methods with CPU implementations
    this.matmul = this.matmulCPU
  }

  /**
   * Initialize matrix multiplication shader
   */
  private async initializeMatMul(): Promise<void> {
    if (!this.device) {
      throw new Error("Device not initialized")
    }

    // Define the shader
    const shaderModule = this.device.createShaderModule({
      code: `
        struct Matrix {
          size : vec2f,
          values : array<f32>,
        }

        @group(0) @binding(0) var<storage, read> matrixA : Matrix;
        @group(0) @binding(1) var<storage, read> matrixB : Matrix;
        @group(0) @binding(2) var<storage, read_write> matrixC : Matrix;

        @compute @workgroup_size(8, 8)
        fn main(@builtin(global_invocation_id) global_id : vec3u) {
          // Guard against out-of-bounds work group sizes
          if (global_id.x >= u32(matrixA.size.x) || global_id.y >= u32(matrixB.size.y)) {
            return;
          }

          let m = u32(matrixA.size.x);
          let n = u32(matrixB.size.y);
          let k = u32(matrixA.size.y);

          var result = 0.0;
          for (var i = 0u; i < k; i = i + 1u) {
            result = result + matrixA.values[global_id.y * k + i] * matrixB.values[i * n + global_id.x];
          }

          matrixC.values[global_id.y * n + global_id.x] = result;
        }
      `,
    })

    // Create the compute pipeline
    const computePipeline = await this.device.createComputePipelineAsync({
      layout: "auto",
      compute: {
        module: shaderModule,
        entryPoint: "main",
      },
    })

    // Implement matrix multiplication
    this.matmul = (a: Float32Array, b: Float32Array, m: number, n: number, k: number): Float32Array => {
      if (!this.device) {
        throw new Error("Device not initialized")
      }

      // Create output buffer
      const resultBuffer = new Float32Array(m * n)

      // Create GPU buffers
      const aBuffer = this.device.createBuffer({
        size: a.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      })

      const bBuffer = this.device.createBuffer({
        size: b.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      })

      const resultGpuBuffer = this.device.createBuffer({
        size: resultBuffer.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      })

      const stagingBuffer = this.device.createBuffer({
        size: resultBuffer.byteLength,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      })

      // Write data to GPU
      this.device.queue.writeBuffer(aBuffer, 0, a)
      this.device.queue.writeBuffer(bBuffer, 0, b)

      // Create bind group
      const bindGroup = this.device.createBindGroup({
        layout: computePipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: {
              buffer: aBuffer,
            },
          },
          {
            binding: 1,
            resource: {
              buffer: bBuffer,
            },
          },
          {
            binding: 2,
            resource: {
              buffer: resultGpuBuffer,
            },
          },
        ],
      })

      // Create command encoder
      const commandEncoder = this.device.createCommandEncoder()
      const passEncoder = commandEncoder.beginComputePass()
      passEncoder.setPipeline(computePipeline)
      passEncoder.setBindGroup(0, bindGroup)
      passEncoder.dispatchWorkgroups(Math.ceil(n / 8), Math.ceil(m / 8))
      passEncoder.end()

      // Copy result to staging buffer
      commandEncoder.copyBufferToBuffer(resultGpuBuffer, 0, stagingBuffer, 0, resultBuffer.byteLength)

      // Submit commands
      this.device.queue.submit([commandEncoder.finish()])

      // Read result
      return new Promise<Float32Array>((resolve) => {
        stagingBuffer.mapAsync(GPUMapMode.READ).then(() => {
          const mapped = stagingBuffer.getMappedRange()
          const result = new Float32Array(mapped.byteLength / 4)
          result.set(new Float32Array(mapped))
          stagingBuffer.unmap()
          resolve(result)
        })
      })
    }
  }

  /**
   * Perform matrix multiplication
   */
  async multiplyMatrices(a: Float32Array, b: Float32Array, m: number, n: number, k: number): Promise<Float32Array> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    if (!this.matmul) {
      throw new Error("Matrix multiplication not initialized")
    }

    return this.matmul(a, b, m, n, k)
  }

  /**
   * Get hardware information
   */
  getHardwareInfo(): HardwareInfo | null {
    return this.hardwareInfo
  }

  /**
   * Check if WebGPU is available
   */
  static isWebGPUAvailable(): boolean {
    return typeof navigator !== "undefined" && !!navigator.gpu
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.device?.destroy()
    this.device = null
    this.adapter = null
    this.isInitialized = false
    this.matmul = null
    this.matmulCPU = null
  }
}
