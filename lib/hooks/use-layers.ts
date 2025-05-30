"use client"

import { useState, useEffect, useCallback } from "react"
import { tensorAPI, type LayerInfo } from "@/lib/api/tensor-api-client"

/**
 * Hook for managing tensor layer operations
 * @returns Object containing layers data, loading state, error state, and layer management functions
 */
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
