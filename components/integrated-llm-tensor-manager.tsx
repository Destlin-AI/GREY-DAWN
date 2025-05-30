"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

export function IntegratedLLMTensorManager() {
  const { toast } = useToast()
  const [modelPath, setModelPath] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const [nvmePath, setNvmePath] = useState("")

  useEffect(() => {
    // Load saved paths
    const savedModelPath = localStorage.getItem("modelPath") || ""
    const savedNvmePath = localStorage.getItem("nvmePath") || ""

    setModelPath(savedModelPath)
    setNvmePath(savedNvmePath)

    // Check status
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      const response = await fetch("/api/tensor")
      const data = await response.json()

      setIsRunning(data.running)
      setStatus(data)
    } catch (error) {
      console.error("Failed to check status:", error)
    }
  }

  const savePaths = () => {
    localStorage.setItem("modelPath", modelPath)
    localStorage.setItem("nvmePath", nvmePath)

    toast({
      title: "Paths saved",
      description: "Model and NVME paths have been saved",
    })
  }

  const startIntegratedSystem = async () => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/tensor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          integrated: true,
          modelPath,
          config: {
            nvmePath,
            contextLength: 4096,
            threads: 8,
          },
        }),
      })

      const data = await response.json()

      if (data.success) {
        setIsRunning(true)
        toast({
          title: "System started",
          description: "Integrated LLM and tensor system is now running",
        })

        // Update status
        checkStatus()
      } else {
        toast({
          title: "Failed to start system",
          description: data.error || "Unknown error",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: String(error),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const stopIntegratedSystem = async () => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/tensor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "stop",
          integrated: true,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setIsRunning(false)
        setStatus(null)
        toast({
          title: "System stopped",
          description: "Integrated LLM and tensor system has been stopped",
        })
      } else {
        toast({
          title: "Failed to stop system",
          description: data.error || "Unknown error",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: String(error),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Integrated LLM & Tensor System</CardTitle>
            <CardDescription>LM Studio with hardware-accelerated tensor operations</CardDescription>
          </div>
          {isRunning && <Badge className="bg-green-500">Running</Badge>}
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="setup">
          <TabsList>
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="layers">Layer Allocation</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="modelPath">Model Path</Label>
              <Input
                id="modelPath"
                value={modelPath}
                onChange={(e) => setModelPath(e.target.value)}
                placeholder="C:\Models\qwen2.5-14b-instruct"
                disabled={isRunning}
              />
              <p className="text-sm text-muted-foreground">Path to your Qwen2.5 14B model</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nvmePath">NVME Cache Path</Label>
              <Input
                id="nvmePath"
                value={nvmePath}
                onChange={(e) => setNvmePath(e.target.value)}
                placeholder="C:\Users\Destlin\gravemind"
                disabled={isRunning}
              />
              <p className="text-sm text-muted-foreground">Path where tensor layers will be cached</p>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={savePaths} disabled={isRunning || isLoading}>
                Save Paths
              </Button>
              <Button
                onClick={isRunning ? stopIntegratedSystem : startIntegratedSystem}
                variant={isRunning ? "destructive" : "default"}
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : isRunning ? "Stop System" : "Start Integrated System"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="status" className="mt-4">
            {status ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Model</h3>
                    <div className="p-4 bg-muted rounded-md">
                      <div className="text-sm">
                        <span className="font-medium">Name:</span> {status.model?.name || "Unknown"}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Parameters:</span> {status.model?.parameters || "Unknown"}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Context:</span> {status.inference?.context_length || "Unknown"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Performance</h3>
                    <div className="p-4 bg-muted rounded-md">
                      <div className="text-sm">
                        <span className="font-medium">Tokens/sec:</span>{" "}
                        {status.inference?.tokens_per_second || "Unknown"}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">GPU Utilization:</span>{" "}
                        {status.tensor?.gpu_utilization || "Unknown"}%
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Memory Usage:</span> {status.tensor?.memory_usage || "Unknown"} GB
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Hardware Status</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-muted rounded-md flex flex-col items-center">
                      <div className="text-sm font-medium">GPU</div>
                      <div className="text-xs">{status.tensor?.gpu_name || "RTX 3070"}</div>
                      <Progress value={status.tensor?.gpu_utilization || 0} className="h-2 mt-2 w-full" />
                      <div className="text-xs mt-1">{status.tensor?.gpu_utilization || 0}% Used</div>
                    </div>

                    <div className="p-4 bg-muted rounded-md flex flex-col items-center">
                      <div className="text-sm font-medium">RAM</div>
                      <div className="text-xs">{status.tensor?.ram_total || 0} GB Total</div>
                      <Progress value={status.tensor?.ram_utilization || 0} className="h-2 mt-2 w-full" />
                      <div className="text-xs mt-1">{status.tensor?.ram_utilization || 0}% Used</div>
                    </div>

                    <div className="p-4 bg-muted rounded-md flex flex-col items-center">
                      <div className="text-sm font-medium">NVME</div>
                      <div className="text-xs">{status.tensor?.nvme_total || 0} GB Total</div>
                      <Progress value={status.tensor?.nvme_utilization || 0} className="h-2 mt-2 w-full" />
                      <div className="text-xs mt-1">{status.tensor?.nvme_utilization || 0}% Used</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <h3 className="text-lg font-medium">System not running</h3>
                <p className="text-sm text-muted-foreground mt-2 mb-4">
                  Start the integrated system to see status information
                </p>
                <Button onClick={startIntegratedSystem} disabled={isLoading}>
                  Start System
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="layers" className="mt-4">
            {status?.tensor ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <div className="text-sm">GPU Layers (RTX 3070)</div>
                    <span className="text-sm">{status.tensor.gpu_layers}</span>
                  </div>
                  <Progress value={(status.tensor.gpu_layers / status.tensor.total_layers) * 100} className="h-2" />
                  <div className="text-xs text-muted-foreground mt-1">Fastest processing, limited by VRAM</div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <div className="text-sm">CPU Layers</div>
                    <span className="text-sm">{status.tensor.cpu_layers}</span>
                  </div>
                  <Progress value={(status.tensor.cpu_layers / status.tensor.total_layers) * 100} className="h-2" />
                  <div className="text-xs text-muted-foreground mt-1">Medium speed, uses system RAM</div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <div className="text-sm">NVME Layers</div>
                    <span className="text-sm">{status.tensor.nvme_layers}</span>
                  </div>
                  <Progress value={(status.tensor.nvme_layers / status.tensor.total_layers) * 100} className="h-2" />
                  <div className="text-xs text-muted-foreground mt-1">Slowest, but allows running larger models</div>
                </div>

                {status.tensor.layer_map && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-2">Layer Distribution</h4>
                    <div className="grid grid-cols-10 gap-1 mt-2">
                      {Array.from({ length: status.tensor.total_layers }).map((_, i) => {
                        const location = status.tensor.layer_map[i]
                        const color =
                          location === "gpu" ? "bg-green-500" : location === "cpu" ? "bg-blue-500" : "bg-amber-500"

                        return (
                          <div
                            key={i}
                            className={`h-4 rounded ${color} flex items-center justify-center`}
                            title={`Layer ${i}: ${location}`}
                          >
                            <span className="text-[8px] text-white font-bold">{i}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex gap-4 mt-2 text-xs">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                        <span>GPU</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
                        <span>CPU</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-amber-500 rounded mr-1"></div>
                        <span>NVME</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <h3 className="text-lg font-medium">No layer information</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Start the integrated system to see layer allocation
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
