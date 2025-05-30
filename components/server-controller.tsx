"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, PlayCircle, StopCircle, RefreshCw } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface ServerControllerProps {
  status: any
  onStatusChange: () => void
}

export function ServerController({ status, onStatusChange }: ServerControllerProps) {
  const [isRunning, setIsRunning] = useState(status?.running || false)
  const [isLoading, setIsLoading] = useState(false)
  const [serverPath, setServerPath] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("tensorServerPath") || ""
    }
    return ""
  })
  const [configPath, setConfigPath] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("tensorConfigPath") || ""
    }
    return ""
  })

  const handlePathSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("tensorServerPath", serverPath)
      localStorage.setItem("tensorConfigPath", configPath)
    }
    toast({
      title: "Paths saved",
      description: "The server and config paths have been saved.",
    })
  }

  const startServer = async () => {
    try {
      setIsLoading(true)

      const response = await fetch("/api/server/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serverPath,
          configPath,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsRunning(true)
        toast({
          title: "Server started",
          description: "The tensor server has been started successfully.",
        })
      } else {
        toast({
          title: "Error starting server",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to start server:", error)
      toast({
        title: "Error starting server",
        description: "Failed to communicate with the API.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      onStatusChange()
    }
  }

  const stopServer = async () => {
    try {
      setIsLoading(true)

      const response = await fetch("/api/server/stop", {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        setIsRunning(false)
        toast({
          title: "Server stopped",
          description: "The tensor server has been stopped successfully.",
        })
      } else {
        toast({
          title: "Error stopping server",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to stop server:", error)
      toast({
        title: "Error stopping server",
        description: "Failed to communicate with the API.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      onStatusChange()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Badge variant={isRunning ? "success" : "secondary"} className={isRunning ? "bg-green-500" : ""}>
          {isRunning ? "Running" : "Stopped"}
        </Badge>
        <span className="text-sm text-gray-500">{status?.pid ? `Process ID: ${status.pid}` : "No active process"}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="server-path">Server Script Path</Label>
          <Input
            id="server-path"
            placeholder="C:\tensor_scripts\adaptive_tensor_server.py"
            value={serverPath}
            onChange={(e) => setServerPath(e.target.value)}
            disabled={isRunning || isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="config-path">Config File Path</Label>
          <Input
            id="config-path"
            placeholder="C:\tensor_scripts\tensor_config.json"
            value={configPath}
            onChange={(e) => setConfigPath(e.target.value)}
            disabled={isRunning || isLoading}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handlePathSave} variant="outline" disabled={isLoading}>
          Save Paths
        </Button>

        {isRunning ? (
          <Button
            onClick={stopServer}
            disabled={isLoading}
            variant="destructive"
            className="flex items-center space-x-2"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <StopCircle className="mr-2 h-4 w-4" />}
            <span>Stop Server</span>
          </Button>
        ) : (
          <Button
            onClick={startServer}
            disabled={isLoading || !serverPath || !configPath}
            className="flex items-center space-x-2"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
            <span>Start Server</span>
          </Button>
        )}

        <Button onClick={onStatusChange} variant="ghost" size="icon" disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {status?.model && (
        <Card className="bg-slate-50 dark:bg-slate-900">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Active Model</p>
                <p className="text-lg">{status.model.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Model Size</p>
                <p className="text-lg">{status.model.size || "Unknown"}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Uptime</p>
                <p className="text-lg">{formatUptime(status.uptime || 0)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">API Endpoint</p>
                <p className="text-lg">{status.api?.url || "Not available"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`
}
