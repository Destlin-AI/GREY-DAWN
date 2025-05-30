import type { SystemMetrics, ProcessInfo, StorageInfo, AlertInfo, MessageInfo } from "@/lib/api"

// Function to convert data to CSV format
export function convertToCSV(data: any[], headers?: string[]): string {
  if (!data || data.length === 0) return ""

  // If headers are not provided, use the keys of the first object
  const csvHeaders = headers || Object.keys(data[0])

  // Create the header row
  let csv = csvHeaders.join(",") + "\n"

  // Add data rows
  data.forEach((item) => {
    const row = csvHeaders.map((header) => {
      // Get the value for this header
      const value = header.includes(".") ? header.split(".").reduce((obj, key) => obj?.[key], item) : item[header]

      // Format the value for CSV
      if (value === null || value === undefined) return ""
      if (typeof value === "string") return `"${value.replace(/"/g, '""')}"`
      return String(value)
    })

    csv += row.join(",") + "\n"
  })

  return csv
}

// Function to convert data to JSON format
export function convertToJSON(data: any): string {
  return JSON.stringify(data, null, 2)
}

// Function to download data as a file
export function downloadFile(data: string, filename: string, mimeType: string): void {
  const blob = new Blob([data], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

// Export system metrics
export function exportSystemMetrics(metrics: SystemMetrics, format: "csv" | "json"): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")

  if (format === "csv") {
    // Convert object to array for CSV
    const data = [metrics]
    const csv = convertToCSV(data)
    downloadFile(csv, `system-metrics-${timestamp}.csv`, "text/csv")
  } else {
    const json = convertToJSON(metrics)
    downloadFile(json, `system-metrics-${timestamp}.json`, "application/json")
  }
}

// Export processes
export function exportProcesses(processes: ProcessInfo[], format: "csv" | "json"): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")

  if (format === "csv") {
    const csv = convertToCSV(processes)
    downloadFile(csv, `processes-${timestamp}.csv`, "text/csv")
  } else {
    const json = convertToJSON(processes)
    downloadFile(json, `processes-${timestamp}.json`, "application/json")
  }
}

// Export storage information
export function exportStorage(storage: StorageInfo[], format: "csv" | "json"): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")

  if (format === "csv") {
    const csv = convertToCSV(storage)
    downloadFile(csv, `storage-${timestamp}.csv`, "text/csv")
  } else {
    const json = convertToJSON(storage)
    downloadFile(json, `storage-${timestamp}.json`, "application/json")
  }
}

// Export alerts
export function exportAlerts(alerts: AlertInfo[], format: "csv" | "json"): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")

  if (format === "csv") {
    const csv = convertToCSV(alerts)
    downloadFile(csv, `alerts-${timestamp}.csv`, "text/csv")
  } else {
    const json = convertToJSON(alerts)
    downloadFile(json, `alerts-${timestamp}.json`, "application/json")
  }
}

// Export messages
export function exportMessages(messages: MessageInfo[], format: "csv" | "json"): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")

  if (format === "csv") {
    const csv = convertToCSV(messages)
    downloadFile(csv, `messages-${timestamp}.csv`, "text/csv")
  } else {
    const json = convertToJSON(messages)
    downloadFile(json, `messages-${timestamp}.json`, "application/json")
  }
}

// Export performance data
export function exportPerformanceData(data: any[], format: "csv" | "json"): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")

  if (format === "csv") {
    const csv = convertToCSV(data)
    downloadFile(csv, `performance-${timestamp}.csv`, "text/csv")
  } else {
    const json = convertToJSON(data)
    downloadFile(json, `performance-${timestamp}.json`, "application/json")
  }
}

// Export all dashboard data
export function exportAllData(
  metrics: SystemMetrics,
  processes: ProcessInfo[],
  storage: StorageInfo[],
  alerts: AlertInfo[],
  messages: MessageInfo[],
  performanceData: any[],
  format: "csv" | "json",
): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")

  const allData = {
    metrics,
    processes,
    storage,
    alerts,
    messages,
    performanceData,
  }

  if (format === "csv") {
    // For CSV, we need to create separate files for each data type
    // Create a zip file with all CSVs
    alert("CSV export of all data is not supported. Please export individual sections.")
  } else {
    const json = convertToJSON(allData)
    downloadFile(json, `dashboard-data-${timestamp}.json`, "application/json")
  }
}
