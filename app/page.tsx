"use client"

import { useEffect, useState } from "react"
import { TensorDashboard } from "@/components/tensor-dashboard"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, RefreshCw, Server, Settings } from "lucide-react"

export default function HomePage() {
  const [isServerRunning, setIsServerRunning] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkServerStatus = async () => {
    try {
      setIsChecking(true)
      setError(null)

      const response = await fetch("/api/server/status", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setIsServerRunning(data.running)
      } else {
        setIsServerRunning(false)
        setError("Server status check failed")
      }
    } catch (err) {
      setIsServerRunning(false)
      setError(err instanceof Error ? err.message : "Failed to check server status")
    } finally {
      setIsChecking(false)
    }
  }

  const startServer = async () => {
    try {
      setIsChecking(true)
      setError(null)

      // Get stored paths from localStorage
      const serverPath = localStorage.getItem("tensorServerPath") || ""
      const configPath = localStorage.getItem("tensorConfigPath") || ""

      if (!serverPath || !configPath) {
        setError("Server and config paths must be configured first")
        return
      }

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

      if (response.ok) {
        // Wait a moment for server to start, then check status
        setTimeout(() => {
          checkServerStatus()
        }, 2000)
      } else {
        const data = await response.json()
        setError(data.error || "Failed to start server")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start server")
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    checkServerStatus()
  }, [])

  // If we're still checking, show loading
  if (isChecking && isServerRunning === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <h2 className="text-xl font-semibold">Checking Tensor Server Status</h2>
          <p className="text-muted-foreground">Please wait while we connect to the tensor engine...</p>
        </div>
      </div>
    )
  }

  // If server is running, show the dashboard
  if (isServerRunning) {
    return <TensorDashboard />
  }

  // If server is not running, show startup interface
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Tensor Engine Control Interface</h1>
            <p className="text-muted-foreground">Advanced AI Model Management System</p>
          </div>

          {/* Server Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Tensor Server Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div>
                    <div className="font-medium">Tensor Server</div>
                    <div className="text-sm text-muted-foreground">Not Running</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={checkServerStatus} disabled={isChecking}>
                    <RefreshCw className={`h-4 w-4 ${isChecking ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                  <Button onClick={startServer} disabled={isChecking}>
                    {isChecking ? "Starting..." : "Start Server"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Server Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Server Script Path</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  placeholder="Path to tensor-server.py"
                  defaultValue={typeof window !== "undefined" ? localStorage.getItem("tensorServerPath") || "" : ""}
                  onChange={(e) => {
                    if (typeof window !== "undefined") {
                      localStorage.setItem("tensorServerPath", e.target.value)
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Config File Path</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  placeholder="Path to tensor_config.json"
                  defaultValue={typeof window !== "undefined" ? localStorage.getItem("tensorConfigPath") || "" : ""}
                  onChange={(e) => {
                    if (typeof window !== "undefined") {
                      localStorage.setItem("tensorConfigPath", e.target.value)
                    }
                  }}
                />
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Configure the paths to your tensor server script and configuration file.</p>
                <p className="mt-1">Default locations:</p>
                <ul className="mt-1 ml-4 list-disc">
                  <li>
                    <code>./scripts/tensor-server.py</code>
                  </li>
                  <li>
                    <code>./tensor_config.json</code>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Quick Start Guide */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Start Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <h4 className="font-medium">1. Install Dependencies</h4>
                <code className="block p-2 bg-muted rounded text-sm">
                  pip install torch transformers fastapi uvicorn psutil zstandard
                </code>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">2. Configure Paths</h4>
                <p className="text-sm text-muted-foreground">Set the server script and config file paths above.</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">3. Start Server</h4>
                <p className="text-sm text-muted-foreground">
                  Click "Start Server" to launch the tensor engine backend.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">4. Access Dashboard</h4>
                <p className="text-sm text-muted-foreground">
                  Once the server is running, the full dashboard interface will be available.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
