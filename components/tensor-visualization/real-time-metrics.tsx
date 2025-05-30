"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useServerStatus, usePerformanceMonitor } from "@/hooks/use-tensor-api"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"
import { Activity, Zap, Clock, TrendingUp, AlertTriangle, Pause, Play } from "lucide-react"

interface MetricPoint {
  timestamp: number
  fps: number
  memoryUsage: number
  renderTime: number
  layerTransfers: number
  queueSize: number
  activeThreads: number
}

export function RealTimeMetrics() {
  const { status, loading, error } = useServerStatus(1000)
  const performanceMetrics = usePerformanceMonitor()
  const [metrics, setMetrics] = useState<MetricPoint[]>([])
  const [isRecording, setIsRecording] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [alerts, setAlerts] = useState<string[]>([])
  const maxDataPoints = 120 // 2 minutes at 1 second intervals

  // Update metrics when status changes
  useEffect(() => {
    if (!status || !isRecording) return

    const newPoint: MetricPoint = {
      timestamp: Date.now(),
      fps: performanceMetrics.fps,
      memoryUsage: performanceMetrics.memoryUsage / (1024 * 1024), // Convert to MB
      renderTime: performanceMetrics.renderTime,
      layerTransfers: status.layer_transfer_queue_size,
      queueSize: status.prefetch_job_queue_size,
      activeThreads: status.active_threads,
    }

    setMetrics((prev) => {
      const updated = [...prev, newPoint]
      return updated.slice(-maxDataPoints)
    })

    // Check for performance alerts
    const newAlerts: string[] = []
    if (performanceMetrics.fps < 30 && performanceMetrics.fps > 0) {
      newAlerts.push("Low FPS detected")
    }
    if (performanceMetrics.memoryUsage > 512 * 1024 * 1024) {
      // 512MB
      newAlerts.push("High memory usage")
    }
    if (status.layer_transfer_queue_size > 50) {
      newAlerts.push("High transfer queue")
    }
    if (status.active_threads > 100) {
      newAlerts.push("High thread count")
    }

    setAlerts(newAlerts)
  }, [status, performanceMetrics, isRecording])

  const formatBytes = (bytes: number): string => {
    const sizes = ["B", "KB", "MB", "GB"]
    if (bytes === 0) return "0 B"
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`
    if (minutes > 0) return `${minutes}m ${secs}s`
    return `${secs}s`
  }

  const clearMetrics = () => {
    setMetrics([])
    setAlerts([])
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Real-Time Metrics</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p>Loading metrics...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Real-Time Metrics</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-red-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Error loading metrics:</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Real-Time Metrics
            {isRecording && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
          </div>

          <div className="flex items-center gap-2">
            {alerts.length > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {alerts.length} Alert{alerts.length > 1 ? "s" : ""}
              </Badge>
            )}

            <Button size="sm" variant="outline" onClick={() => setIsRecording(!isRecording)}>
              {isRecording ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>

            <Button size="sm" variant="outline" onClick={clearMetrics}>
              Clear
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Performance Alerts
            </h4>
            <ul className="space-y-1">
              {alerts.map((alert, index) => (
                <li key={index} className="text-sm text-red-700 dark:text-red-300">
                  • {alert}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Current Status */}
        {status && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Activity className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold text-blue-600">{performanceMetrics.fps.toFixed(0)}</div>
              <div className="text-sm text-muted-foreground">FPS</div>
            </div>

            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Zap className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold text-green-600">{formatBytes(performanceMetrics.memoryUsage)}</div>
              <div className="text-sm text-muted-foreground">Memory</div>
            </div>

            <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Clock className="h-6 w-6 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold text-purple-600">{performanceMetrics.renderTime.toFixed(1)}ms</div>
              <div className="text-sm text-muted-foreground">Render Time</div>
            </div>

            <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <TrendingUp className="h-6 w-6 mx-auto mb-2 text-orange-600" />
              <div className="text-2xl font-bold text-orange-600">{formatUptime(status.uptime_seconds)}</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch id="advanced-metrics" checked={showAdvanced} onCheckedChange={setShowAdvanced} />
            <Label htmlFor="advanced-metrics">Show Advanced Metrics</Label>
          </div>

          <div className="text-sm text-muted-foreground">
            Recording: {metrics.length}/{maxDataPoints} points
          </div>
        </div>

        {/* Performance Chart */}
        <div className="h-64">
          <h4 className="font-semibold mb-2">Performance Trends</h4>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleTimeString()} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                formatter={(value: number, name: string) => {
                  if (name === "FPS") return [value.toFixed(0), name]
                  if (name === "Memory") return [`${value.toFixed(1)} MB`, name]
                  if (name === "Render Time") return [`${value.toFixed(1)} ms`, name]
                  return [value, name]
                }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="fps"
                stroke="#3b82f6"
                name="FPS"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="memoryUsage"
                stroke="#10b981"
                name="Memory"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="renderTime"
                stroke="#f59e0b"
                name="Render Time"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Advanced Metrics */}
        {showAdvanced && status && (
          <div className="space-y-4">
            <h4 className="font-semibold">Advanced Metrics</h4>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Layer Transfers</div>
                <div className="text-2xl font-bold">{status.layer_transfer_queue_size}</div>
              </div>

              <div className="border rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Prefetch Queue</div>
                <div className="text-2xl font-bold">{status.prefetch_job_queue_size}</div>
              </div>

              <div className="border rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Active Threads</div>
                <div className="text-2xl font-bold">{status.active_threads}</div>
              </div>

              <div className="border rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Server Status</div>
                <div className="text-lg font-semibold capitalize">{status.server_status}</div>
              </div>

              <div className="border rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Model Status</div>
                <div className="text-lg font-semibold capitalize">{status.model_status.status}</div>
              </div>

              {status.log_file_path && (
                <div className="border rounded-lg p-3">
                  <div className="text-sm text-muted-foreground">Log File</div>
                  <div className="text-xs truncate">{status.log_file_path}</div>
                </div>
              )}
            </div>

            {/* System Metrics Chart */}
            <div className="h-48">
              <h5 className="font-medium mb-2">System Metrics</h5>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleTimeString()} />
                  <YAxis />
                  <Tooltip labelFormatter={(value) => new Date(value).toLocaleTimeString()} />
                  <Area
                    type="monotone"
                    dataKey="layerTransfers"
                    stackId="1"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.6}
                    name="Layer Transfers"
                  />
                  <Area
                    type="monotone"
                    dataKey="queueSize"
                    stackId="1"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.6}
                    name="Queue Size"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
