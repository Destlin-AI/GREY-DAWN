"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Play, StopCircle, FileSearch } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface ServerControlsProps {
  status: any
  isLoading: boolean
  onStart: (serverPath: string, configPath: string) => Promise<void>
  onStop: () => Promise<void>
}

export function ServerControls({ status, isLoading, onStart, onStop }: ServerControlsProps) {
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

  const [isStarting, setIsStarting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)

  const isRunning = status?.running || false

  const handleStart = async () => {
    if (!serverPath || !configPath) {
      toast({
        title: "Missing paths",
        description: "Please provide both server script and config paths",
        variant: "destructive",
      })
      return
    }

    try {
      setIsStarting(true)

      // Save paths to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("tensorServerPath", serverPath)
        localStorage.setItem("tensorConfigPath", configPath)
      }

      await onStart(serverPath, configPath)

      toast({
        title: "Server started",
        description: "Tensor server is now running",
      })
    } catch (error: any) {
      toast({
        title: "Failed to start server",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsStarting(false)
    }
  }

  const handleStop = async () => {
    try {
      setIsStopping(true)
      await onStop()

      toast({
        title: "Server stopped",
        description: "Tensor server has been shut down",
      })
    } catch (error: any) {
      toast({
        title: "Failed to stop server",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsStopping(false)
    }
  }

  const handleBrowse = (type: "server" | "config") => {
    // In a real implementation, this would open a file browser dialog
    toast({
      title: "File browser",
      description: `File browser would open to select ${type === "server" ? "server script" : "config file"}`,
    })
  }

  return (
    <div className="space-y-4">
      {!isRunning && (
        <>
          <div className="space-y-2">
            <Label htmlFor="server-path" className="text-sm text-slate-400">
              Server Script Path
            </Label>
            <div className="flex gap-2">
              <Input
                id="server-path"
                placeholder="C:\tensor_scripts\adaptive_tensor_server.py"
                value={serverPath}
                onChange={(e) => setServerPath(e.target.value)}
                disabled={isStarting || isLoading}
                className="bg-slate-900 text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleBrowse("server")}
                disabled={isStarting || isLoading}
              >
                <FileSearch className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="config-path" className="text-sm text-slate-400">
              Config File Path
            </Label>
            <div className="flex gap-2">
              <Input
                id="config-path"
                placeholder="C:\tensor_scripts\tensor_config.json"
                value={configPath}
                onChange={(e) => setConfigPath(e.target.value)}
                disabled={isStarting || isLoading}
                className="bg-slate-900 text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleBrowse("config")}
                disabled={isStarting || isLoading}
              >
                <FileSearch className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <div className="pt-2">
        {isRunning ? (
          <Button
            onClick={handleStop}
            disabled={isStopping || isLoading}
            variant="destructive"
            className="w-full gap-2"
          >
            {isStopping ? <Loader2 className="h-4 w-4 animate-spin" /> : <StopCircle className="h-4 w-4" />}
            Stop Server
          </Button>
        ) : (
          <Button
            onClick={handleStart}
            disabled={isStarting || isLoading || !serverPath || !configPath}
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Start Server
          </Button>
        )}
      </div>

      {isRunning && status?.pid && (
        <div className="rounded-md bg-slate-900 p-2 text-center text-xs text-slate-400">Process ID: {status.pid}</div>
      )}
    </div>
  )
}
