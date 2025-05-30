"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  tensorAPI,
  type ServerStatus,
  type HardwareInfo,
  type LayerInfo,
  type ModelStatus,
} from "@/lib/api/tensor-api-client"

// Custom hook for server status with real-time updates
export function useServerStatus(refreshInterval = 5000) {
  const [status, setStatus] = useState<ServerStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout>()
  const maxRetries = 3

  const fetchStatus = useCallback(async () => {
    try {
      const serverStatus = await tensorAPI.getServerStatus()
      setStatus(serverStatus)
      setError(null)
      setRetryCount(0) // Reset retry count on success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch server status"

      if (retryCount < maxRetries) {
        setRetryCount((prev) => prev + 1)
        console.warn(`Server status fetch failed (attempt ${retryCount + 1}/${maxRetries}):`, errorMessage)
        // Retry after a delay
        setTimeout(fetchStatus, 2000 * (retryCount + 1))
        return
      }

      setError(errorMessage)
      console.error("Server status fetch failed after max retries:", err)
    } finally {
      setLoading(false)
    }
  }, [retryCount, maxRetries])

  useEffect(() => {
    fetchStatus()

    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchStatus, refreshInterval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchStatus, refreshInterval])

  return { status, loading, error, refetch: fetchStatus }
}

// Custom hook for hardware monitoring
export function useHardwareMonitor(refreshInterval = 2000) {
  const [hardware, setHardware] = useState<HardwareInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout>()
  const maxRetries = 3

  const fetchHardware = useCallback(async () => {
    try {
      const hardwareInfo = await tensorAPI.getHardwareInfo()
      setHardware(hardwareInfo)
      setError(null)
      setRetryCount(0)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch hardware info"

      if (retryCount < maxRetries) {
        setRetryCount((prev) => prev + 1)
        console.warn(`Hardware info fetch failed (attempt ${retryCount + 1}/${maxRetries}):`, errorMessage)
        setTimeout(fetchHardware, 2000 * (retryCount + 1))
        return
      }

      setError(errorMessage)
      console.error("Hardware info fetch failed after max retries:", err)
    } finally {
      setLoading(false)
    }
  }, [retryCount, maxRetries])

  useEffect(() => {
    fetchHardware()

    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchHardware, refreshInterval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchHardware, refreshInterval])

  return { hardware, loading, error, refetch: fetchHardware }
}

// Custom hook for layer management
export function useLayers() {
  const [layers, setLayers] = useState<LayerInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3

  const fetchLayers = useCallback(async () => {
    try {
      setLoading(true)
      const layerList = await tensorAPI.getLayers()
      setLayers(layerList)
      setError(null)
      setRetryCount(0)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch layers"

      if (retryCount < maxRetries) {
        setRetryCount((prev) => prev + 1)
        console.warn(`Layers fetch failed (attempt ${retryCount + 1}/${maxRetries}):`, errorMessage)
        setTimeout(fetchLayers, 2000 * (retryCount + 1))
        return
      }

      setError(errorMessage)
      console.error("Layers fetch failed after max retries:", err)
    } finally {
      setLoading(false)
    }
  }, [retryCount, maxRetries])

  const transferLayer = useCallback(
    async (layerId: number, destination: string, priority = 5) => {
      try {
        await tensorAPI.transferLayer({
          layer_id: layerId,
          destination_device: destination,
          priority,
        })
        // Refresh layers after transfer
        await fetchLayers()
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : "Failed to transfer layer")
      }
    },
    [fetchLayers],
  )

  useEffect(() => {
    fetchLayers()
  }, [fetchLayers])

  return {
    layers,
    loading,
    error,
    refetch: fetchLayers,
    transferLayer,
  }
}

// Custom hook for model management
export function useModel() {
  const [model, setModel] = useState<ModelStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchModelStatus = useCallback(async () => {
    try {
      const modelStatus = await tensorAPI.getModelStatus()
      setModel(modelStatus)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch model status")
    }
  }, [])

  const loadModel = useCallback(async (modelPath: string, computeDevice?: string, hfToken?: string) => {
    try {
      setLoading(true)
      setError(null)
      const result = await tensorAPI.loadModel({
        model_name_or_path: modelPath,
        compute_device: computeDevice,
        hf_token: hfToken,
      })
      setModel(result)
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load model"
      setError(errorMsg)
      throw new Error(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [])

  const unloadModel = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await tensorAPI.unloadModel()
      setModel(result)
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to unload model"
      setError(errorMsg)
      throw new Error(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [])

  const generateText = useCallback(
    async (prompt: string, maxTokens = 128, temperature = 0.7, topP = 0.9, topK?: number) => {
      try {
        const result = await tensorAPI.generateText({
          prompt,
          max_new_tokens: maxTokens,
          temperature,
          top_p: topP,
          top_k: topK,
        })
        return result
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : "Failed to generate text")
      }
    },
    [],
  )

  useEffect(() => {
    fetchModelStatus()
  }, [fetchModelStatus])

  return {
    model,
    loading,
    error,
    loadModel,
    unloadModel,
    generateText,
    refetch: fetchModelStatus,
  }
}

// Custom hook for WebSocket connections
export function useWebSocket(endpoint: string, onMessage?: (data: any) => void) {
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const connect = useCallback(() => {
    try {
      wsRef.current = tensorAPI.createWebSocket(endpoint)

      wsRef.current.onopen = () => {
        setConnected(true)
        setError(null)
      }

      wsRef.current.onmessage = (event) => {
        if (onMessage) {
          try {
            const data = JSON.parse(event.data)
            onMessage(data)
          } catch (err) {
            console.error("Failed to parse WebSocket message:", err)
          }
        }
      }

      wsRef.current.onerror = (event) => {
        setError("WebSocket connection error")
        setConnected(false)
      }

      wsRef.current.onclose = () => {
        setConnected(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create WebSocket connection")
    }
  }, [endpoint, onMessage])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
      setConnected(false)
    }
  }, [])

  const sendMessage = useCallback(
    (data: any) => {
      if (wsRef.current && connected) {
        wsRef.current.send(JSON.stringify(data))
      }
    },
    [connected],
  )

  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])

  return { connected, error, sendMessage, reconnect: connect, disconnect }
}

// Performance monitoring hook
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    fps: 0,
    memoryUsage: 0,
    renderTime: 0,
    updateTime: 0,
  })

  const frameRef = useRef<number>()
  const lastTimeRef = useRef<number>(performance.now())
  const frameCountRef = useRef<number>(0)

  const updateMetrics = useCallback(() => {
    const now = performance.now()
    const delta = now - lastTimeRef.current
    frameCountRef.current++

    if (delta >= 1000) {
      // Update every second
      const fps = Math.round((frameCountRef.current * 1000) / delta)

      setMetrics((prev) => ({
        ...prev,
        fps,
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
        renderTime: delta / frameCountRef.current,
        updateTime: now,
      }))

      frameCountRef.current = 0
      lastTimeRef.current = now
    }

    frameRef.current = requestAnimationFrame(updateMetrics)
  }, [])

  useEffect(() => {
    frameRef.current = requestAnimationFrame(updateMetrics)
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [updateMetrics])

  return metrics
}

// Add error boundary hook
export function useErrorBoundary() {
  const [error, setError] = useState<Error | null>(null)

  const resetError = useCallback(() => {
    setError(null)
  }, [])

  const captureError = useCallback((error: Error) => {
    console.error("Captured error:", error)
    setError(error)
  }, [])

  useEffect(() => {
    if (error) {
      // Log error to external service if needed
      console.error("Error boundary captured:", error)
    }
  }, [error])

  return { error, resetError, captureError }
}
