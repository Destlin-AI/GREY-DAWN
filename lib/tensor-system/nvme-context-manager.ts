/**
 * NVME Context Manager
 * Handles storing and retrieving context data from NVME storage
 * Implements async parallel processing and compression for performance
 */

import { EventEmitter } from "events"
import fs from "fs"
import path from "path"
import { compressData, decompressData } from "../utils/compression"

// Promisify zlib functions
// const gzipAsync = promisify(zlib.gzip)
// const gunzipAsync = promisify(zlib.gunzip)

export interface NVMEContextConfig {
  nvmePath: string
  compressionLevel: number // 0-9, higher means more compression
  chunkSize: number // Number of tokens per chunk
  maxCachedChunks: number // Maximum number of chunks to keep in memory
  prefetchWindow: number // How many chunks to prefetch ahead
  parallelOperations: number // Maximum number of parallel operations
}

interface ContextChunk {
  id: string
  startToken: number
  endToken: number
  data: Uint8Array
  lastAccessed: number
  isDirty: boolean
}

export class NVMEContextManager extends EventEmitter {
  private config: NVMEContextConfig
  private isInitialized = false
  private contextDir: string
  private cachedChunks: Map<string, ContextChunk> = new Map()
  private chunkIndex: Map<number, string> = new Map() // Maps token position to chunk ID
  private operationQueue: Array<() => Promise<void>> = []
  private isProcessingQueue = false
  private totalTokens = 0

  constructor(config: Partial<NVMEContextConfig> = {}) {
    super()

    // Default configuration
    this.config = {
      nvmePath: "",
      compressionLevel: 6,
      chunkSize: 4096, // 4K tokens per chunk
      maxCachedChunks: 32, // Keep 32 chunks in memory (128K tokens)
      prefetchWindow: 8, // Prefetch 8 chunks ahead (32K tokens)
      parallelOperations: 8, // 8 parallel operations
      ...config,
    }

    this.contextDir = ""
  }

  /**
   * Initialize the NVME context manager
   */
  async initialize(nvmePath: string): Promise<boolean> {
    if (this.isInitialized) {
      return true
    }

    try {
      this.config.nvmePath = nvmePath

      // Create context directory
      this.contextDir = path.join(nvmePath, "context_cache")

      // In browser environment, we can't use fs
      if (typeof window === "undefined") {
        if (!fs.existsSync(this.contextDir)) {
          fs.mkdirSync(this.contextDir, { recursive: true })
        }
      }

      this.isInitialized = true
      this.emit("initialized", { nvmePath, contextDir: this.contextDir })
      return true
    } catch (error) {
      console.error("Failed to initialize NVME context manager:", error)
      this.emit("error", { message: "Failed to initialize NVME context manager", error })
      return false
    }
  }

  /**
   * Store tokens in the context
   */
  async storeTokens(tokens: number[], position: number): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("NVME context manager not initialized")
    }

    // Update total tokens
    this.totalTokens = Math.max(this.totalTokens, position + tokens.length)

    // Determine which chunks need to be updated
    const startChunkIndex = Math.floor(position / this.config.chunkSize)
    const endChunkIndex = Math.floor((position + tokens.length - 1) / this.config.chunkSize)

    // Queue operations for each chunk
    for (let chunkIndex = startChunkIndex; chunkIndex <= endChunkIndex; chunkIndex++) {
      const chunkStartToken = chunkIndex * this.config.chunkSize
      const chunkEndToken = chunkStartToken + this.config.chunkSize - 1

      // Calculate which tokens from the input belong to this chunk
      const chunkTokensStart = Math.max(0, chunkStartToken - position)
      const chunkTokensEnd = Math.min(tokens.length, chunkEndToken - position + 1)
      const chunkTokens = tokens.slice(chunkTokensStart, chunkTokensEnd)

      // Calculate where in the chunk these tokens should go
      const offsetInChunk = position + chunkTokensStart - chunkStartToken

      // Queue the update operation
      this.queueOperation(async () => {
        await this.updateChunk(chunkIndex, offsetInChunk, chunkTokens)
      })
    }

    // Queue prefetching operations
    this.queuePrefetchOperations(endChunkIndex + 1)

    // Process the queue
    this.processQueue()
  }

  /**
   * Retrieve tokens from the context
   */
  async retrieveTokens(startPosition: number, length: number): Promise<number[]> {
    if (!this.isInitialized) {
      throw new Error("NVME context manager not initialized")
    }

    // Ensure we're not requesting beyond the stored tokens
    if (startPosition + length > this.totalTokens) {
      length = Math.max(0, this.totalTokens - startPosition)
    }

    if (length === 0) {
      return []
    }

    // Determine which chunks need to be retrieved
    const startChunkIndex = Math.floor(startPosition / this.config.chunkSize)
    const endChunkIndex = Math.floor((startPosition + length - 1) / this.config.chunkSize)

    // Prepare array for results
    const result: number[] = new Array(length)

    // Queue operations for each chunk
    const retrievalPromises: Promise<void>[] = []

    for (let chunkIndex = startChunkIndex; chunkIndex <= endChunkIndex; chunkIndex++) {
      const chunkStartToken = chunkIndex * this.config.chunkSize
      const chunkEndToken = chunkStartToken + this.config.chunkSize - 1

      // Calculate which tokens from the chunk we need
      const resultStartIndex = Math.max(0, chunkStartToken - startPosition)
      const resultEndIndex = Math.min(length, chunkEndToken - startPosition + 1)

      // Calculate where in the chunk these tokens are
      const offsetInChunk = startPosition + resultStartIndex - chunkStartToken
      const lengthInChunk = resultEndIndex - resultStartIndex

      // Queue the retrieval operation
      retrievalPromises.push(
        this.retrieveChunk(chunkIndex).then((chunkData) => {
          if (chunkData) {
            // Copy tokens from chunk to result
            const chunkTokens = this.deserializeTokens(chunkData)
            for (let i = 0; i < lengthInChunk; i++) {
              if (offsetInChunk + i < chunkTokens.length) {
                result[resultStartIndex + i] = chunkTokens[offsetInChunk + i]
              }
            }
          }
        }),
      )
    }

    // Wait for all retrievals to complete
    await Promise.all(retrievalPromises)

    // Queue prefetching operations
    this.queuePrefetchOperations(endChunkIndex + 1)

    // Process the queue
    this.processQueue()

    return result
  }

  /**
   * Queue an operation to be executed
   */
  private queueOperation(operation: () => Promise<void>): void {
    this.operationQueue.push(operation)
  }

  /**
   * Process the operation queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) {
      return
    }

    this.isProcessingQueue = true

    try {
      while (this.operationQueue.length > 0) {
        // Take up to N operations from the queue
        const batch = this.operationQueue.splice(0, this.config.parallelOperations)

        // Execute them in parallel
        await Promise.all(batch.map((operation) => operation()))
      }
    } finally {
      this.isProcessingQueue = false
    }
  }

  /**
   * Queue prefetching operations
   */
  private queuePrefetchOperations(startChunkIndex: number): void {
    for (let i = 0; i < this.config.prefetchWindow; i++) {
      const chunkIndex = startChunkIndex + i

      // Check if this chunk might exist and isn't already cached
      if (
        chunkIndex * this.config.chunkSize < this.totalTokens &&
        !this.cachedChunks.has(this.getChunkId(chunkIndex))
      ) {
        this.queueOperation(async () => {
          await this.retrieveChunk(chunkIndex)
        })
      }
    }
  }

  /**
   * Update a chunk with new tokens
   */
  private async updateChunk(chunkIndex: number, offsetInChunk: number, tokens: number[]): Promise<void> {
    const chunkId = this.getChunkId(chunkIndex)

    // Try to get the chunk from cache
    let chunk = this.cachedChunks.get(chunkId)

    if (!chunk) {
      // Try to load the chunk from disk
      try {
        const chunkData = await this.loadChunkFromDisk(chunkId)
        if (chunkData) {
          chunk = {
            id: chunkId,
            startToken: chunkIndex * this.config.chunkSize,
            endToken: (chunkIndex + 1) * this.config.chunkSize - 1,
            data: chunkData,
            lastAccessed: Date.now(),
            isDirty: false,
          }
        }
      } catch (error) {
        // Chunk doesn't exist yet, which is fine
      }
    }

    if (!chunk) {
      // Create a new chunk
      const chunkTokens = new Array(this.config.chunkSize).fill(0)

      // Add the new tokens
      for (let i = 0; i < tokens.length; i++) {
        if (offsetInChunk + i < chunkTokens.length) {
          chunkTokens[offsetInChunk + i] = tokens[i]
        }
      }

      // Serialize and compress
      const serializedData = this.serializeTokens(chunkTokens)

      chunk = {
        id: chunkId,
        startToken: chunkIndex * this.config.chunkSize,
        endToken: (chunkIndex + 1) * this.config.chunkSize - 1,
        data: serializedData,
        lastAccessed: Date.now(),
        isDirty: true,
      }
    } else {
      // Update existing chunk
      const chunkTokens = this.deserializeTokens(chunk.data)

      // Add the new tokens
      for (let i = 0; i < tokens.length; i++) {
        if (offsetInChunk + i < chunkTokens.length) {
          chunkTokens[offsetInChunk + i] = tokens[i]
        }
      }

      // Serialize and compress
      const serializedData = this.serializeTokens(chunkTokens)

      chunk.data = serializedData
      chunk.lastAccessed = Date.now()
      chunk.isDirty = true
    }

    // Update cache
    this.cachedChunks.set(chunkId, chunk)
    this.chunkIndex.set(chunkIndex, chunkId)

    // Save to disk
    await this.saveChunkToDisk(chunk)

    // Manage cache size
    this.manageCache()
  }

  /**
   * Retrieve a chunk
   */
  private async retrieveChunk(chunkIndex: number): Promise<Uint8Array | null> {
    const chunkId = this.getChunkId(chunkIndex)

    // Try to get the chunk from cache
    let chunk = this.cachedChunks.get(chunkId)

    if (!chunk) {
      // Try to load the chunk from disk
      try {
        const chunkData = await this.loadChunkFromDisk(chunkId)
        if (chunkData) {
          chunk = {
            id: chunkId,
            startToken: chunkIndex * this.config.chunkSize,
            endToken: (chunkIndex + 1) * this.config.chunkSize - 1,
            data: chunkData,
            lastAccessed: Date.now(),
            isDirty: false,
          }

          // Update cache
          this.cachedChunks.set(chunkId, chunk)
          this.chunkIndex.set(chunkIndex, chunkId)

          // Manage cache size
          this.manageCache()
        }
      } catch (error) {
        // Chunk doesn't exist
        return null
      }
    } else {
      // Update last accessed time
      chunk.lastAccessed = Date.now()
    }

    return chunk ? chunk.data : null
  }

  /**
   * Manage the cache size
   */
  private manageCache(): void {
    if (this.cachedChunks.size <= this.config.maxCachedChunks) {
      return
    }

    // Sort chunks by last accessed time
    const sortedChunks = Array.from(this.cachedChunks.values()).sort((a, b) => a.lastAccessed - b.lastAccessed)

    // Remove oldest chunks until we're under the limit
    const chunksToRemove = sortedChunks.slice(0, sortedChunks.length - this.config.maxCachedChunks)

    for (const chunk of chunksToRemove) {
      // If the chunk is dirty, save it first
      if (chunk.isDirty) {
        this.queueOperation(async () => {
          await this.saveChunkToDisk(chunk)
        })
      }

      // Remove from cache
      this.cachedChunks.delete(chunk.id)
    }
  }

  /**
   * Get a chunk ID from its index
   */
  private getChunkId(chunkIndex: number): string {
    return `chunk_${chunkIndex}`
  }

  /**
   * Load a chunk from disk
   */
  private async loadChunkFromDisk(chunkId: string): Promise<Uint8Array | null> {
    // In browser environment, we can't use fs
    if (typeof window !== "undefined") {
      return null
    }

    const chunkPath = path.join(this.contextDir, `${chunkId}.bin`)

    try {
      const compressedData = await fs.promises.readFile(chunkPath)
      const decompressedData = await decompressData(compressedData)
      return decompressedData
    } catch (error) {
      // File doesn't exist or other error
      return null
    }
  }

  /**
   * Save a chunk to disk
   */
  private async saveChunkToDisk(chunk: ContextChunk): Promise<void> {
    // In browser environment, we can't use fs
    if (typeof window !== "undefined") {
      return
    }

    const chunkPath = path.join(this.contextDir, `${chunk.id}.bin`)

    try {
      const compressedData = await compressData(chunk.data, {
        level: this.config.compressionLevel,
      })

      await fs.promises.writeFile(chunkPath, compressedData)

      // Mark as no longer dirty
      chunk.isDirty = false
    } catch (error) {
      console.error(`Failed to save chunk ${chunk.id}:`, error)
      this.emit("error", { message: `Failed to save chunk ${chunk.id}`, error })
    }
  }

  /**
   * Serialize tokens to a binary format
   */
  private serializeTokens(tokens: number[]): Uint8Array {
    // For simplicity, we'll use 4 bytes per token (Int32)
    const buffer = new ArrayBuffer(tokens.length * 4)
    const view = new Int32Array(buffer)

    for (let i = 0; i < tokens.length; i++) {
      view[i] = tokens[i]
    }

    return new Uint8Array(buffer)
  }

  /**
   * Deserialize tokens from a binary format
   */
  private deserializeTokens(data: Uint8Array): number[] {
    const view = new Int32Array(data.buffer)
    return Array.from(view)
  }

  /**
   * Get the current status
   */
  getStatus(): {
    isInitialized: boolean
    totalTokens: number
    cachedChunks: number
    nvmePath: string
    contextDir: string
  } {
    return {
      isInitialized: this.isInitialized,
      totalTokens: this.totalTokens,
      cachedChunks: this.cachedChunks.size,
      nvmePath: this.config.nvmePath,
      contextDir: this.contextDir,
    }
  }

  /**
   * Reset the context
   */
  async reset(): Promise<void> {
    this.totalTokens = 0
    this.cachedChunks.clear()
    this.chunkIndex.clear()
    this.operationQueue = []

    this.emit("reset")
  }
}

// Singleton instance
let nvmeContextManagerInstance: NVMEContextManager | null = null

export function getNVMEContextManager(config?: Partial<NVMEContextConfig>): NVMEContextManager {
  if (!nvmeContextManagerInstance) {
    nvmeContextManagerInstance = new NVMEContextManager(config)
  }
  return nvmeContextManagerInstance
}
