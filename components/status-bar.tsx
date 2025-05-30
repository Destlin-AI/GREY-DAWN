"use client"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

interface StatusBarProps {
  status: any
  isLoading: boolean
}

export function StatusBar({ status, isLoading }: StatusBarProps) {
  const isRunning = status?.running || false

  return (
    <div className="mb-6 flex items-center justify-between rounded-lg bg-white p-4 shadow-sm dark:bg-slate-900">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          ) : (
            <div className={`h-3 w-3 rounded-full ${isRunning ? "bg-green-500" : "bg-red-500"}`}></div>
          )}
          <span className="font-medium">Server Status:</span>
          <Badge variant={isRunning ? "success" : "destructive"} className={isRunning ? "bg-green-500" : ""}>
            {isRunning ? "Running" : "Stopped"}
          </Badge>
        </div>

        {isRunning && (
          <>
            <div className="hidden items-center space-x-2 md:flex">
              <span className="font-medium">PID:</span>
              <span>{status.pid || "Unknown"}</span>
            </div>

            <div className="hidden items-center space-x-2 md:flex">
              <span className="font-medium">API:</span>
              <span>{status.api?.url || "Not available"}</span>
            </div>

            {status.model && (
              <div className="hidden items-center space-x-2 md:flex">
                <span className="font-medium">Model:</span>
                <span>{status.model.name || "None"}</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="text-sm text-slate-500">
        {isRunning ? <span>Last updated: {new Date().toLocaleTimeString()}</span> : <span>Server not running</span>}
      </div>
    </div>
  )
}
