"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { tensorAPI, type ServerStatus } from "@/lib/api/tensor-api-client"

/**
 * Hook for monitoring tensor server status with real-time updates
 * @param refreshInterval Interval in milliseconds to refresh status (default: 5000)
 * @returns Object containing server status, loading state, error state, and refetch function
 */
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
