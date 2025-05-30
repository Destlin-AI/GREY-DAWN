import useSWR from "swr"
import type { SystemMetrics, ProcessInfo, StorageInfo, AlertInfo, MessageInfo } from "@/lib/api"

// Generic fetcher function for SWR
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("An error occurred while fetching the data.")
    return res.json()
  })

// Hook for system metrics
export function useSystemMetrics() {
  const { data, error, isLoading, mutate } = useSWR<SystemMetrics>(
    "/api/metrics",
    fetcher,
    { refreshInterval: 5000 }, // Refresh every 5 seconds
  )

  return {
    metrics: data,
    isLoading,
    isError: error,
    mutate,
  }
}

// Hook for processes
export function useProcesses() {
  const { data, error, isLoading, mutate } = useSWR<ProcessInfo[]>(
    "/api/processes",
    fetcher,
    { refreshInterval: 10000 }, // Refresh every 10 seconds
  )

  return {
    processes: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}

// Hook for storage information
export function useStorage() {
  const { data, error, isLoading, mutate } = useSWR<StorageInfo[]>(
    "/api/storage",
    fetcher,
    { refreshInterval: 30000 }, // Refresh every 30 seconds
  )

  return {
    storage: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}

// Hook for system alerts
export function useAlerts() {
  const { data, error, isLoading, mutate } = useSWR<AlertInfo[]>(
    "/api/alerts",
    fetcher,
    { refreshInterval: 15000 }, // Refresh every 15 seconds
  )

  return {
    alerts: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}

// Hook for communication messages
export function useMessages() {
  const { data, error, isLoading, mutate } = useSWR<MessageInfo[]>(
    "/api/messages",
    fetcher,
    { refreshInterval: 10000 }, // Refresh every 10 seconds
  )

  return {
    messages: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}

// Hook for performance data
export function usePerformanceData() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/performance",
    fetcher,
    { refreshInterval: 15000 }, // Refresh every 15 seconds
  )

  return {
    performanceData: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}
