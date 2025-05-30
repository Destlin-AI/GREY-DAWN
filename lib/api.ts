// API endpoints
const API_BASE_URL = "/api"

export interface SystemMetrics {
  cpuUsage: number
  memoryUsage: number
  networkStatus: number
  systemStatus: number
  securityLevel: number
}

export interface ProcessInfo {
  pid: string
  name: string
  user: string
  cpu: number
  memory: number
  status: string
}

export interface StorageInfo {
  name: string
  total: number
  used: number
  type: string
}

export interface AlertInfo {
  id: string
  title: string
  time: string
  description: string
  type: "info" | "warning" | "error" | "success" | "update"
}

export interface MessageInfo {
  id: string
  sender: string
  time: string
  message: string
  avatar: string
  unread: boolean
}

// Fetch system metrics
export async function fetchSystemMetrics(): Promise<SystemMetrics> {
  const response = await fetch(`${API_BASE_URL}/metrics`)

  if (!response.ok) {
    throw new Error("Failed to fetch system metrics")
  }

  return response.json()
}

// Fetch running processes
export async function fetchProcesses(): Promise<ProcessInfo[]> {
  const response = await fetch(`${API_BASE_URL}/processes`)

  if (!response.ok) {
    throw new Error("Failed to fetch processes")
  }

  return response.json()
}

// Fetch storage information
export async function fetchStorage(): Promise<StorageInfo[]> {
  const response = await fetch(`${API_BASE_URL}/storage`)

  if (!response.ok) {
    throw new Error("Failed to fetch storage information")
  }

  return response.json()
}

// Fetch system alerts
export async function fetchAlerts(): Promise<AlertInfo[]> {
  const response = await fetch(`${API_BASE_URL}/alerts`)

  if (!response.ok) {
    throw new Error("Failed to fetch system alerts")
  }

  return response.json()
}

// Fetch communication messages
export async function fetchMessages(): Promise<MessageInfo[]> {
  const response = await fetch(`${API_BASE_URL}/messages`)

  if (!response.ok) {
    throw new Error("Failed to fetch messages")
  }

  return response.json()
}

// Fetch performance data for charts
export async function fetchPerformanceData(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/performance`)

  if (!response.ok) {
    throw new Error("Failed to fetch performance data")
  }

  return response.json()
}
