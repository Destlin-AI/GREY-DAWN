"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, CheckCircle, Server, Cpu, HardDrive, MemoryStickIcon as Memory } from "lucide-react"

interface TensorEngineStatusProps {
  initialStatus?: any
}

export function TensorEngineStatus({ initialStatus }: TensorEngineStatusProps) {
  const [status, setStatus] = useState(initialStatus || { status: "unknown" })
  const [layers, setLayers] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("status")

  // Fetch status periodically
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/tensor")
        if (response.ok) {
          const data = await response.json()
          setStatus(data)
        }
      } catch (error) {
        console.error("Failed to fetch tensor engine status:", error)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  // Fetch layers when tab changes to layers
  useEffect(() => {
    if (activeTab === "layers") {
      fetchLayers()
    }
  }, [activeTab])

  const fetchLayers = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/tensor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "layers" }),
      })

      if (response.ok) {
        const data = await response.json()
        setLayers(data)
      }
    } catch (error) {
      console.error("Failed to fetch layers:", error)
    } finally {
      setLoading(false)
    }
  }

  const startEngine = async () => {
    try {
      setLoading(true)
      await fetch("/api/tensor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      })
      // Status will be updated by the periodic fetch
    } catch (error) {
      console.error("Failed to start tensor engine:", error)
    } finally {
      setLoading(false)
    }
  }

  const stopEngine = async () => {
    try {
      setLoading(true)
      await fetch("/api/tensor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      })
      // Status will be updated by the periodic fetch
    } catch (error) {
      console.error("Failed to stop tensor engine:", error)
    } finally {
      setLoading(false)
    }
  }

  const isRunning = status.status === "running" || status.running === true

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Tensor Engine
          {isRunning ? (
            <Badge variant="success" className="ml-2 bg-green-500">
              Running
            </Badge>
          ) : (
            <Badge variant="destructive" className="ml-2">
              Stopped
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Distributed inference system with hardware-aware layer allocation</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="layers">Layers</TabsTrigger>
            <TabsTrigger value="hardware">Hardware</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4 mt-4">
            {isRunning ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Engine is active</span>
                  </div>
                  <Button variant="destructive" size="sm" onClick={stopEngine} disabled={loading}>
                    Stop Engine
                  </Button>
                </div>

                {status.config && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Layer Allocation</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">GPU Layers</span>
                        <span className="font-medium">{status.config.gpu_layers || "N/A"}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">CPU Layers</span>
                        <span className="font-medium">{status.config.cpu_layers || "N/A"}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">NVME Layers</span>
                        <span className="font-medium">{status.config.nvme_layers || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                )}

                {status.layer_transfers && (
                  <div>
                    <h4 className="text-sm font-medium">Transfer Queue</h4>
                    <span className="text-sm">{status.layer_transfers.queue_size || 0} pending transfers</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <AlertCircle className="h-12 w-12 text-muted-foreground" />
                <div className="text-center">
                  <h3 className="font-medium">Tensor Engine is not running</h3>
                  <p className="text-sm text-muted-foreground">Start the engine to enable distributed inference</p>
                </div>
                <Button onClick={startEngine} disabled={loading}>
                  Start Engine
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="layers" className="space-y-4 mt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Loading layer information...</p>
                  <Progress value={50} className="w-64" />
                </div>
              </div>
            ) : layers ? (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2 text-sm font-medium">
                  <div>Layer ID</div>
                  <div>Device</div>
                  <div>Priority</div>
                  <div>Status</div>
                </div>
                <Separator />
                {layers.layer_map ? (
                  Object.entries(layers.layer_map).map(([id, info]: [string, any]) => (
                    <div key={id} className="grid grid-cols-4 gap-2 text-sm">
                      <div>{id}</div>
                      <div className="flex items-center gap-1">
                        {info.device === "gpu" && <Cpu className="h-3 w-3" />}
                        {info.device === "cpu" && <Cpu className="h-3 w-3" />}
                        {info.device === "ram" && <Memory className="h-3 w-3" />}
                        {info.device === "nvme" && <HardDrive className="h-3 w-3" />}
                        {info.device}
                      </div>
                      <div>
                        <Badge
                          variant={
                            info.priority === "high" ? "default" : info.priority === "medium" ? "secondary" : "outline"
                          }
                        >
                          {info.priority}
                        </Badge>
                      </div>
                      <div>Active</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">No layer information available</div>
                )}
              </div>
            ) : (
              <div className="flex justify-center py-8">
                <Button onClick={fetchLayers} disabled={loading}>
                  Load Layer Information
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="hardware" className="space-y-4 mt-4">
            {isRunning && status.gpu && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">GPU</h4>
                  <div className="space-y-2">
                    <div className="text-sm">Count: {status.gpu.count || 0}</div>
                    {status.gpu.memory &&
                      status.gpu.memory.map((gpu: any, index: number) => (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>
                              GPU {gpu.device}: {gpu.allocated_mb?.toFixed(0) || 0}MB /{" "}
                              {gpu.reserved_mb?.toFixed(0) || 0}MB
                            </span>
                            <span>{((gpu.allocated_mb / gpu.reserved_mb) * 100).toFixed(0)}%</span>
                          </div>
                          <Progress value={(gpu.allocated_mb / gpu.reserved_mb) * 100} />
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">CPU</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Usage: {status.cpu?.percent || 0}%</span>
                      <span>
                        Cores: {status.cpu?.count || 0} / Threads: {status.cpu?.threads || 0}
                      </span>
                    </div>
                    <Progress value={status.cpu?.percent || 0} />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">RAM</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>
                        Usage: {status.ram?.used_gb?.toFixed(1) || 0}GB / {status.ram?.total_gb?.toFixed(1) || 0}GB
                      </span>
                      <span>{status.ram?.percent || 0}%</span>
                    </div>
                    <Progress value={status.ram?.percent || 0} />
                  </div>
                </div>

                {status.nvme && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">NVME Storage</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>
                          Usage: {status.nvme?.used_gb?.toFixed(1) || 0}GB / {status.nvme?.total_gb?.toFixed(1) || 0}GB
                        </span>
                        <span>{status.nvme?.percent_used?.toFixed(1) || 0}%</span>
                      </div>
                      <Progress value={status.nvme?.percent_used || 0} />
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      <div>Layers: {status.nvme?.layer_count || 0}</div>
                      <div>Reads: {status.nvme?.health_stats?.reads || 0}</div>
                      <div>Writes: {status.nvme?.health_stats?.writes || 0}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isRunning && (
              <div className="flex justify-center py-8 text-center">
                <div>
                  <p className="text-muted-foreground mb-4">Start the tensor engine to view hardware utilization</p>
                  <Button onClick={startEngine} disabled={loading}>
                    Start Engine
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Optimized distributed inference with GPU, CPU, RAM, and NVME offloading
      </CardFooter>
    </Card>
  )
}
