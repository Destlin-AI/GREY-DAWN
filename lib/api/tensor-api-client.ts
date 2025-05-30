import { z } from "zod"

// API Response Types
export const LayerInfoSchema = z.object({
  id: z.number(),
  name: z.string(),
  original_size_mb: z.number(),
  current_size_mb: z.number(),
  current_device: z.string(),
  gpu_id: z.number().nullable(),
  quantization_type: z.string().nullable(),
  compression_type: z.string().nullable(),
  access_count: z.number(),
  last_access_timestamp: z.number(),
})

export const ModelStatusSchema = z.object({
  model_name: z.string().nullable(),
  model_path: z.string().nullable(),
  architecture: z.string().nullable(),
  tokenizer_name: z.string().nullable(),
  num_managed_layers: z.number(),
  compute_device: z.string().nullable(),
  status: z.string(),
  error_message: z.string().nullable(),
})

export const HardwareInfoSchema = z.object({
  gpu: z.object({
    available: z.boolean(),
    count: z.number(),
    devices: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        total_memory_bytes: z.number(),
        usable_memory_bytes_planning: z.number(),
        compute_capability: z.string(),
      }),
    ),
    total_usable_vram_bytes_planning: z.number().optional(),
  }),
  cpu: z.object({
    cores_physical: z.number(),
    cores_logical: z.number(),
    current_percent_usage_total: z.number(),
    max_utilization_percent_limit: z.number(),
  }),
  ram: z.object({
    total_bytes: z.number(),
    available_bytes_current: z.number(),
    percent_used_current: z.number(),
    usable_bytes_for_planning: z.number(),
    usable_bytes_dynamic_available: z.number(),
  }),
  nvme: z.object({
    available: z.boolean(),
    path: z.string().nullable(),
    filesystem_total_bytes: z.number().optional(),
    filesystem_free_bytes_current: z.number().optional(),
    server_usable_bytes_limit: z.number().optional(),
    health_stats: z
      .object({
        reads: z.number(),
        writes: z.number(),
        bytes_read: z.number(),
        bytes_written: z.number(),
        files: z.number(),
        errors: z.number(),
      })
      .optional(),
  }),
  ramdisk: z.object({
    available: z.boolean(),
    path: z.string().nullable(),
    total_bytes_allocated_os: z.number().optional(),
    usable_bytes_for_server: z.number().optional(),
    filesystem_free_bytes_current: z.number().optional(),
    health_stats: z
      .object({
        reads: z.number(),
        writes: z.number(),
        bytes_read: z.number(),
        bytes_written: z.number(),
        files: z.number(),
        errors: z.number(),
      })
      .optional(),
  }),
  log_file_path: z.string().nullable(),
})

export const ServerStatusSchema = z.object({
  server_status: z.string(),
  uptime_seconds: z.number(),
  model_status: ModelStatusSchema,
  hardware_summary: HardwareInfoSchema,
  layer_transfer_queue_size: z.number(),
  prefetch_job_queue_size: z.number(),
  active_threads: z.number(),
  log_file_path: z.string().nullable(),
})

export type LayerInfo = z.infer<typeof LayerInfoSchema>
export type ModelStatus = z.infer<typeof ModelStatusSchema>
export type HardwareInfo = z.infer<typeof HardwareInfoSchema>
export type ServerStatus = z.infer<typeof ServerStatusSchema>

// API Request Types
export interface TransferRequest {
  layer_id: number
  destination_device: string
  priority?: number
}

export interface ModelLoadRequest {
  model_name_or_path: string
  compute_device?: string
  hf_token?: string
}

export interface GenerateRequest {
  prompt: string
  max_new_tokens?: number
  temperature?: number
  top_p?: number
  top_k?: number
}

export interface GenerateResponse {
  prompt: string
  generated_text: string
  model_name: string
  tokens_generated: number
  generation_time_seconds: number
}

// Error types
export class TensorAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: Response,
  ) {
    super(message)
    this.name = "TensorAPIError"
  }
}

// API Client Class
export class TensorAPIClient {
  private baseURL: string
  private apiKey?: string

  constructor(baseURL = "http://localhost:8000", apiKey?: string) {
    this.baseURL = baseURL.replace(/\/$/, "") // Remove trailing slash
    this.apiKey = apiKey
  }

  private async request<T>(endpoint: string, options: RequestInit = {}, schema?: z.ZodSchema<T>): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    }

    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      })

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorData.error || errorMessage
        } catch {
          // If we can't parse JSON, use the status text
          const errorText = await response.text()
          errorMessage = errorText || errorMessage
        }
        throw new TensorAPIError(errorMessage, response.status, response)
      }

      const data = await response.json()

      if (schema) {
        try {
          return schema.parse(data)
        } catch (error) {
          console.error("Schema validation failed:", error)
          console.error("Received data:", data)
          throw new TensorAPIError("Invalid response format from server")
        }
      }

      return data
    } catch (error) {
      if (error instanceof TensorAPIError) {
        throw error
      }

      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new TensorAPIError("Network error: Unable to connect to tensor server")
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        throw new TensorAPIError("Request timeout: Server took too long to respond")
      }

      throw new TensorAPIError(error instanceof Error ? error.message : "Unknown error occurred")
    }
  }

  // Server Status
  async getServerStatus(): Promise<ServerStatus> {
    return this.request("/api/status", {}, ServerStatusSchema)
  }

  async getServerInfo(): Promise<any> {
    return this.request("/api")
  }

  // Hardware Information
  async getHardwareInfo(): Promise<HardwareInfo> {
    return this.request("/api/hardware", {}, HardwareInfoSchema)
  }

  // Layer Management
  async getLayers(): Promise<LayerInfo[]> {
    return this.request("/api/layers", {}, z.array(LayerInfoSchema))
  }

  async getLayer(layerId: number): Promise<LayerInfo> {
    return this.request(`/api/layers/${layerId}`, {}, LayerInfoSchema)
  }

  async transferLayer(request: TransferRequest): Promise<any> {
    return this.request("/api/layers/transfer", {
      method: "POST",
      body: JSON.stringify(request),
    })
  }

  // Model Management
  async loadModel(request: ModelLoadRequest): Promise<ModelStatus> {
    return this.request(
      "/api/models/load",
      {
        method: "POST",
        body: JSON.stringify(request),
      },
      ModelStatusSchema,
    )
  }

  async unloadModel(): Promise<ModelStatus> {
    return this.request(
      "/api/models/unload",
      {
        method: "POST",
      },
      ModelStatusSchema,
    )
  }

  async getModelStatus(): Promise<ModelStatus> {
    return this.request("/api/models/status", {}, ModelStatusSchema)
  }

  async generateText(request: GenerateRequest): Promise<GenerateResponse> {
    return this.request("/api/models/generate", {
      method: "POST",
      body: JSON.stringify(request),
    })
  }

  // WebSocket connection for real-time updates
  createWebSocket(endpoint: string): WebSocket {
    const wsURL = this.baseURL.replace(/^http/, "ws") + endpoint
    return new WebSocket(wsURL)
  }

  // Utility methods
  formatBytes(bytes: number): string {
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
    if (bytes === 0) return "0 Bytes"
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`
    if (minutes > 0) return `${minutes}m ${secs}s`
    return `${secs}s`
  }
}

// Default client instance
export const tensorAPI = new TensorAPIClient()
