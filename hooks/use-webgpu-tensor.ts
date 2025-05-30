"use client"

import { useState, useEffect, useCallback } from "react"
import { getWebGPUTensorEngine, type WebGPUTensorEngine } from "@/lib/tensor-engine/webgpu-tensor-engine"

interface UseWebGPUTensorOptions {
  autoInitialize?: boolean
}

export function useWebGPUTensor(options: UseWebGPUTensorOptions = {}) {
  const { autoInitialize = false } = options
  const [engine] = useState<WebGPUTensorEngine>(() => getWebGPUTensorEngine())
  const [status, setStatus] = useState(() => engine.getStatus())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleStatusChange = () => {
      setStatus(engine.getStatus())
    }

    const handleError = (err: any) => {
      console.error("Tensor engine error:", err)
      setError(err.message || "An unknown error occurred")
      setIsLoading(false)
    }

    // Listen for events
    engine.on("initialized", handleStatusChange)
    engine.on("started", handleStatusChange)
    engine.on("stopped", handleStatusChange)
    engine.on("hardware-updated", handleStatusChange)
    engine.on("allocation-updated", handleStatusChange)
    engine.on("layers-initialized", handleStatusChange)
    engine.on("error", handleError)

    // Auto-initialize if requested
    if (autoInitialize) {
      initialize()
    }

    return () => {
      // Clean up event listeners
      engine.off("initialized", handleStatusChange)
      engine.off("started", handleStatusChange)
      engine.off("stopped", handleStatusChange)
      engine.off("hardware-updated", handleStatusChange)
      engine.off("allocation-updated", handleStatusChange)
      engine.off("layers-initialized", handleStatusChange)
      engine.off("error", handleError)
    }
  }, [engine, autoInitialize])

  const initialize = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await engine.initialize()
      if (!result) {
        setError("Failed to initialize tensor engine")
      }
      return result
    } catch (err: any) {
      setError(err.message || "Failed to initialize tensor engine")
      return false
    } finally {
      setIsLoading(false)
    }
  }, [engine])

  const startEngine = useCallback(
    async (modelName: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await engine.start(modelName)
        if (!result) {
          setError("Failed to start tensor engine")
        }
        return result
      } catch (err: any) {
        setError(err.message || "Failed to start tensor engine")
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [engine],
  )

  const stopEngine = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await engine.stop()
      if (!result) {
        setError("Failed to stop tensor engine")
      }
      return result
    } catch (err: any) {
      setError(err.message || "Failed to stop tensor engine")
      return false
    } finally {
      setIsLoading(false)
    }
  }, [engine])

  const setStoragePath = useCallback(
    (path: string) => {
      try {
        engine.setStoragePath(path)
        return true
      } catch (err: any) {
        setError(err.message || "Failed to set storage path")
        return false
      }
    },
    [engine],
  )

  const runInference = useCallback(
    async (input: Float32Array) => {
      setIsLoading(true)
      setError(null)
      try {
        return await engine.runInference(input)
      } catch (err: any) {
        setError(err.message || "Failed to run inference")
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [engine],
  )

  const matmul = useCallback(
    async (a: Float32Array, b: Float32Array, m: number, n: number, k: number) => {
      setIsLoading(true)
      setError(null)
      try {
        return await engine.matmul(a, b, m, n, k)
      } catch (err: any) {
        setError(err.message || "Failed to perform matrix multiplication")
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [engine],
  )

  return {
    status,
    isLoading,
    error,
    initialize,
    startEngine,
    stopEngine,
    setStoragePath,
    runInference,
    matmul,
    clearError: () => setError(null),
  }
}
