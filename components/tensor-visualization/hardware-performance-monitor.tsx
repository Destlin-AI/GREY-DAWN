"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useHardwareMonitor } from "@/hooks/use-tensor-api"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Cpu, HardDrive, MemoryStick, Zap, Activity } from "lucide-react"

interface MetricDataPoint {
  timestamp: number
  cpuUsage: number
  ramUsage: number
  gpuUsage?: number
  nvmeUsage?: number
  temperature?: number
}

export function HardwarePerformanceMonitor() {
  const { hardware, loading, error } = useHardwareMonitor(1000) // Update every second
  const [metrics, setMetrics] = useState<MetricDataPoint[]>([])
  const [alerts, setAlerts] = useState<string[]>([])
  const maxDataPoints = 60 // Keep last 60 seconds

  // Update metrics when hardware data changes
  useEffect(() => {
    if (!hardware) return

    const newDataPoint: MetricDataPoint = {
      timestamp: Date.now(),
      cpuUsage: hardware.cpu.current_percent_usage_total,
      ramUsage: hardware.ram.percent_used_current,
      gpuUsage: hardware.gpu.devices[0]?.utilization || 0,
      nvmeUsage: hardware.nvme.available
        ? ((hardware.nvme.filesystem_total_bytes! - hardware.nvme.filesystem_free_bytes_current!) /
            hardware.nvme.filesystem_total_bytes!) *
          100
        : 0,
    }

    setMetrics((prev) => {
      const updated = [...prev, newDataPoint]
      return updated.slice(-maxDataPoints)
    })

    // Check for alerts
    const newAlerts: string[] = []
    if (hardware.cpu.current_percent_usage_total > 90) {
      newAlerts.push("High CPU usage detected")
    }
    if (hardware.ram.percent_used_current > 85) {
      newAlerts.push("High RAM usage detected")
    }
    if (hardware.gpu.devices.some((gpu) => gpu.temperature && gpu.temperature > 80)) {
      newAlerts.push("High GPU temperature detected")
    }

    setAlerts(newAlerts)
  }, [hardware])

  const formatBytes = (bytes: number): string => {
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
    if (bytes === 0) return "0 Bytes"
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Hardware Performance Monitor</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p>Loading hardware data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Hardware Performance Monitor</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-red-500">
            <p>Error loading hardware data:</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!hardware) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Hardware Performance Monitor</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p>No hardware data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Hardware Performance Monitor
          {alerts.length > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {alerts.length} Alert{alerts.length > 1 ? "s" : ""}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="cpu">CPU</TabsTrigger>
            <TabsTrigger value="gpu">GPU</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Alerts */}
            {alerts.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">System Alerts</h4>
                <ul className="space-y-1">
                  {alerts.map((alert, index) => (
                    <li key={index} className="text-sm text-red-700 dark:text-red-300">
                      • {alert}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Cpu className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-bold text-blue-600">
                  {hardware.cpu.current_percent_usage_total.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">CPU Usage</div>
              </div>

              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <MemoryStick className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold text-green-600">{hardware.ram.percent_used_current.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">RAM Usage</div>
              </div>

              <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Zap className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <div className="text-2xl font-bold text-purple-600">{hardware.gpu.count}</div>
                <div className="text-sm text-muted-foreground">GPU{hardware.gpu.count !== 1 ? "s" : ""}</div>
              </div>

              <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <HardDrive className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                <div className="text-2xl font-bold text-orange-600">{hardware.nvme.available ? "Active" : "N/A"}</div>
                <div className="text-sm text-muted-foreground">NVMe Storage</div>
              </div>
            </div>

            {/* Performance Chart */}
            <div className="h-64">
              <h4 className="font-semibold mb-2">Performance Trends</h4>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleTimeString()} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                    formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                  />
                  <Line type="monotone" dataKey="cpuUsage" stroke="#3b82f6" name="CPU" strokeWidth={2} />
                  <Line type="monotone" dataKey="ramUsage" stroke="#10b981" name="RAM" strokeWidth={2} />
                  {hardware.gpu.available && (
                    <Line type="monotone" dataKey="gpuUsage" stroke="#8b5cf6" name="GPU" strokeWidth={2} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="cpu" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">CPU Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Physical Cores:</span>
                    <span>{hardware.cpu.cores_physical}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Logical Cores:</span>
                    <span>{hardware.cpu.cores_logical}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Usage:</span>
                    <span>{hardware.cpu.current_percent_usage_total.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Usage Limit:</span>
                    <span>{hardware.cpu.max_utilization_percent_limit}%</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">CPU Usage</h4>
                <div className="space-y-2">
                  <Progress value={hardware.cpu.current_percent_usage_total} className="h-3" />
                  <div className="text-xs text-muted-foreground text-center">
                    {hardware.cpu.current_percent_usage_total.toFixed(1)}% of{" "}
                    {hardware.cpu.max_utilization_percent_limit}% limit
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">RAM Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span>{formatBytes(hardware.ram.total_bytes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Available:</span>
                    <span>{formatBytes(hardware.ram.available_bytes_current)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Usable for Planning:</span>
                    <span>{formatBytes(hardware.ram.usable_bytes_for_planning)}</span>
                  </div>
                </div>
                <div>
                  <Progress value={hardware.ram.percent_used_current} className="h-3 mb-2" />
                  <div className="text-xs text-muted-foreground text-center">
                    {hardware.ram.percent_used_current.toFixed(1)}% used
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="gpu" className="space-y-4">
            {hardware.gpu.available ? (
              <div className="space-y-4">
                {hardware.gpu.devices.map((gpu, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">
                      GPU {index}: {gpu.name}
                    </h4>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Total Memory:</span>
                          <span>{formatBytes(gpu.total_memory_bytes)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Usable Memory:</span>
                          <span>{formatBytes(gpu.usable_memory_bytes_planning)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Compute Capability:</span>
                          <span>{gpu.compute_capability}</span>
                        </div>
                      </div>

                      <div>
                        <div className="mb-2">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Memory Usage</span>
                            <span>
                              {(
                                ((gpu.total_memory_bytes - gpu.usable_memory_bytes_planning) / gpu.total_memory_bytes) *
                                100
                              ).toFixed(1)}
                              %
                            </span>
                          </div>
                          <Progress
                            value={
                              ((gpu.total_memory_bytes - gpu.usable_memory_bytes_planning) / gpu.total_memory_bytes) *
                              100
                            }
                            className="h-2"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h4 className="font-semibold mb-2">No GPU Available</h4>
                <p className="text-muted-foreground">No compatible GPUs detected on this system.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="storage" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* NVMe Storage */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center">
                  <HardDrive className="h-5 w-5 mr-2" />
                  NVMe Storage
                </h4>

                {hardware.nvme.available ? (
                  <div className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Path:</span>
                        <span className="truncate ml-2">{hardware.nvme.path}</span>
                      </div>
                      {hardware.nvme.filesystem_total_bytes && (
                        <>
                          <div className="flex justify-between">
                            <span>Total:</span>
                            <span>{formatBytes(hardware.nvme.filesystem_total_bytes)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Free:</span>
                            <span>{formatBytes(hardware.nvme.filesystem_free_bytes_current || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Server Limit:</span>
                            <span>{formatBytes(hardware.nvme.server_usable_bytes_limit || 0)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {hardware.nvme.filesystem_total_bytes && hardware.nvme.filesystem_free_bytes_current && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Usage</span>
                          <span>
                            {(
                              ((hardware.nvme.filesystem_total_bytes - hardware.nvme.filesystem_free_bytes_current) /
                                hardware.nvme.filesystem_total_bytes) *
                              100
                            ).toFixed(1)}
                            %
                          </span>
                        </div>
                        <Progress
                          value={
                            ((hardware.nvme.filesystem_total_bytes - hardware.nvme.filesystem_free_bytes_current) /
                              hardware.nvme.filesystem_total_bytes) *
                            100
                          }
                          className="h-2"
                        />
                      </div>
                    )}

                    {hardware.nvme.health_stats && (
                      <div className="pt-2 border-t">
                        <div className="text-xs text-muted-foreground">Health Stats</div>
                        <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                          <div>Reads: {hardware.nvme.health_stats.reads}</div>
                          <div>Writes: {hardware.nvme.health_stats.writes}</div>
                          <div>Files: {hardware.nvme.health_stats.files}</div>
                          <div>Errors: {hardware.nvme.health_stats.errors}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">NVMe storage not configured</p>
                  </div>
                )}
              </div>

              {/* RAMDisk */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  RAMDisk
                </h4>

                {hardware.ramdisk.available ? (
                  <div className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Path:</span>
                        <span className="truncate ml-2">{hardware.ramdisk.path}</span>
                      </div>
                      {hardware.ramdisk.total_bytes_allocated_os && (
                        <>
                          <div className="flex justify-between">
                            <span>Total:</span>
                            <span>{formatBytes(hardware.ramdisk.total_bytes_allocated_os)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Usable:</span>
                            <span>{formatBytes(hardware.ramdisk.usable_bytes_for_server || 0)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {hardware.ramdisk.health_stats && (
                      <div className="pt-2 border-t">
                        <div className="text-xs text-muted-foreground">Health Stats</div>
                        <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                          <div>Reads: {hardware.ramdisk.health_stats.reads}</div>
                          <div>Writes: {hardware.ramdisk.health_stats.writes}</div>
                          <div>Files: {hardware.ramdisk.health_stats.files}</div>
                          <div>Errors: {hardware.ramdisk.health_stats.errors}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">RAMDisk not enabled</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
