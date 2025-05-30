"use client"

import { useCallback } from "react"

import { useEffect } from "react"

import { useState } from "react"

interface PerformanceMetrics {
  fps: number
  frameTime: number
  memoryUsage: number
  gpuMemoryUsage?: number
  renderCalls: number
  triangleCount: number
  shaderSwitches: number
  textureBinds: number
  bufferUpdates: number
  timestamp: number
}

interface PerformanceThresholds {
  minFPS: number
  maxFrameTime: number
  maxMemoryUsage: number
  maxGPUMemoryUsage?: number
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0,
    memoryUsage: 0,
    renderCalls: 0,
    triangleCount: 0,
    shaderSwitches: 0,
    textureBinds: 0,
    bufferUpdates: 0,
    timestamp: performance.now(),
  }

  private thresholds: PerformanceThresholds = {
    minFPS: 30,
    maxFrameTime: 33.33, // 30 FPS = 33.33ms per frame
    maxMemoryUsage: 512 * 1024 * 1024, // 512MB
    maxGPUMemoryUsage: 1024 * 1024 * 1024, // 1GB
  }

  private frameCount = 0
  private lastTime = performance.now()
  private frameStartTime = 0
  private callbacks: Array<(metrics: PerformanceMetrics) => void> = []
  private warningCallbacks: Array<(warning: string, metrics: PerformanceMetrics) => void> = []

  private isMonitoring = false
  private animationFrameId: number | null = null

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    if (thresholds) {
      Object.assign(this.thresholds, thresholds)
    }
  }

  start(): void {
    if (this.isMonitoring) return

    this.isMonitoring = true
    this.lastTime = performance.now()
    this.frameCount = 0
    this.monitor()
  }

  stop(): void {
    this.isMonitoring = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  beginFrame(): void {
    this.frameStartTime = performance.now()
    this.resetFrameCounters()
  }

  endFrame(): void {
    const now = performance.now()
    this.metrics.frameTime = now - this.frameStartTime
    this.frameCount++

    // Update FPS every second
    const deltaTime = now - this.lastTime
    if (deltaTime >= 1000) {
      this.metrics.fps = Math.round((this.frameCount * 1000) / deltaTime)
      this.frameCount = 0
      this.lastTime = now
    }

    this.updateMemoryMetrics()
    this.metrics.timestamp = now
    this.checkThresholds()
    this.notifyCallbacks()
  }

  private monitor(): void {
    if (!this.isMonitoring) return

    this.updateMemoryMetrics()
    this.metrics.timestamp = performance.now()
    this.notifyCallbacks()

    this.animationFrameId = requestAnimationFrame(() => this.monitor())
  }

  private resetFrameCounters(): void {
    this.metrics.renderCalls = 0
    this.metrics.triangleCount = 0
    this.metrics.shaderSwitches = 0
    this.metrics.textureBinds = 0
    this.metrics.bufferUpdates = 0
  }

  private updateMemoryMetrics(): void {
    // Update JavaScript heap memory usage
    if ("memory" in performance) {
      const memory = (performance as any).memory
      this.metrics.memoryUsage = memory.usedJSHeapSize
    }

    // Update GPU memory usage if WebGL context is available
    // This would need to be called from the rendering context
    // this.updateGPUMemoryUsage()
  }

  updateGPUMemoryUsage(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    // Get GPU memory info if extension is available
    const memoryInfo = gl.getExtension("WEBGL_debug_renderer_info")
    if (memoryInfo) {
      // This is approximate and may not be accurate across all browsers/drivers
      const renderer = gl.getParameter(memoryInfo.UNMASKED_RENDERER_WEBGL)
      // Parse renderer string for memory info if available
      // This is highly vendor-specific and not reliable
    }
  }

  private checkThresholds(): void {
    const warnings: string[] = []

    if (this.metrics.fps < this.thresholds.minFPS) {
      warnings.push(`Low FPS: ${this.metrics.fps} (threshold: ${this.thresholds.minFPS})`)
    }

    if (this.metrics.frameTime > this.thresholds.maxFrameTime) {
      warnings.push(
        `High frame time: ${this.metrics.frameTime.toFixed(2)}ms (threshold: ${this.thresholds.maxFrameTime}ms)`,
      )
    }

    if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      warnings.push(
        `High memory usage: ${this.formatBytes(this.metrics.memoryUsage)} (threshold: ${this.formatBytes(this.thresholds.maxMemoryUsage)})`,
      )
    }

    if (
      this.metrics.gpuMemoryUsage &&
      this.thresholds.maxGPUMemoryUsage &&
      this.metrics.gpuMemoryUsage > this.thresholds.maxGPUMemoryUsage
    ) {
      warnings.push(
        `High GPU memory usage: ${this.formatBytes(this.metrics.gpuMemoryUsage)} (threshold: ${this.formatBytes(this.thresholds.maxGPUMemoryUsage)})`,
      )
    }

    warnings.forEach((warning) => {
      this.warningCallbacks.forEach((callback) => callback(warning, this.metrics))
    })
  }

  private notifyCallbacks(): void {
    this.callbacks.forEach((callback) => callback({ ...this.metrics }))
  }

  // Public methods for tracking render operations
  incrementRenderCalls(): void {
    this.metrics.renderCalls++
  }

  addTriangles(count: number): void {
    this.metrics.triangleCount += count
  }

  incrementShaderSwitches(): void {
    this.metrics.shaderSwitches++
  }

  incrementTextureBinds(): void {
    this.metrics.textureBinds++
  }

  incrementBufferUpdates(): void {
    this.metrics.bufferUpdates++
  }

  // Callback management
  onMetricsUpdate(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.callbacks.push(callback)
    return () => {
      const index = this.callbacks.indexOf(callback)
      if (index > -1) {
        this.callbacks.splice(index, 1)
      }
    }
  }

  onWarning(callback: (warning: string, metrics: PerformanceMetrics) => void): () => void {
    this.warningCallbacks.push(callback)
    return () => {
      const index = this.warningCallbacks.indexOf(callback)
      if (index > -1) {
        this.warningCallbacks.splice(index, 1)
      }
    }
  }

  // Getters
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds }
  }

  setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    Object.assign(this.thresholds, thresholds)
  }

  // Utility methods
  private formatBytes(bytes: number): string {
    const sizes = ["Bytes", "KB", "MB", "GB"]
    if (bytes === 0) return "0 Bytes"
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  // Static methods for one-off measurements
  static measureAsync<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now()
    return fn().then((result) => ({
      result,
      duration: performance.now() - start,
    }))
  }

  static measure<T>(fn: () => T): { result: T; duration: number } {
    const start = performance.now()
    const result = fn()
    return {
      result,
      duration: performance.now() - start,
    }
  }
}

// Global performance monitor instance
export const globalPerformanceMonitor = new PerformanceMonitor()

// Performance monitoring decorator
export function monitored<T extends (...args: any[]) => any>(
  target: any,
  propertyName: string,
  descriptor: TypedPropertyDescriptor<T>,
): TypedPropertyDescriptor<T> | void {
  const method = descriptor.value!

  descriptor.value = ((...args: any[]) => {
    const start = performance.now()
    const result = method.apply(target, args)
    const duration = performance.now() - start

    console.log(`${propertyName} took ${duration.toFixed(2)}ms`)

    return result
  }) as T
}

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  useEffect(() => {
    const unsubscribeMetrics = globalPerformanceMonitor.onMetricsUpdate(setMetrics)
    const unsubscribeWarnings = globalPerformanceMonitor.onWarning((warning) => {
      setWarnings((prev) => [...prev.slice(-9), warning]) // Keep last 10 warnings
    })

    globalPerformanceMonitor.start()

    return () => {
      unsubscribeMetrics()
      unsubscribeWarnings()
      globalPerformanceMonitor.stop()
    }
  }, [])

  const clearWarnings = useCallback(() => {
    setWarnings([])
  }, [])

  return { metrics, warnings, clearWarnings }
}
