"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useQwenTensor } from "@/hooks/use-qwen-tensor"

export function QwenTensorManager() {
  const { toast } = useToast()
  const [modelPath, setModelPath] = useState("")
  const [nvmePath, setNvmePath] = useState("")
  const [useNVMEContext, setUseNVMEContext] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [toastReady, setToastReady] = useState(false)

  const {
    isRunning,
    model,
    hardware,
    allocation,
    context,
    error,
    startEngine,
    stopEngine,
    setNvmePath: setTensorNvmePath,
    setUseNVMEContext: setTensorUseNVMEContext,
  } = useQwenTensor()

  useEffect(() => {
    // Load saved paths
    const savedModelPath = localStorage.getItem("qwenModelPath") || ""
    const savedNvmePath = localStorage.getItem("nvmePath") || ""
    const savedUseNVMEContext = localStorage.getItem("useNVMEContext") !== "false" // Default to true

    setModelPath(savedModelPath)
    setNvmePath(savedNvmePath)
    setUseNVMEContext(savedUseNVMEContext)

    // Set NVME path in tensor engine
    if (savedNvmePath) {
      setTensorNvmePath(savedNvmePath)
    }

    // Set NVME context usage
    setTensorUseNVMEContext(savedUseNVMEContext)

    // Mark toast as ready for client-side rendering
    setToastReady(true)
  }, [setTensorNvmePath, setTensorUseNVMEContext])

  // Handle errors
  useEffect(() => {
    if (error && toastReady) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      })
    }
  }, [error, toast, toastReady])

  const savePaths = () => {
    localStorage.setItem("qwenModelPath", modelPath)
    localStorage.setItem("nvmePath", nvmePath)
    localStorage.setItem("useNVMEContext", useNVMEContext.toString())

    // Set NVME path in tensor engine
    setTensorNvmePath(nvmePath)

    // Set NVME context usage
    setTensorUseNVMEContext(useNVMEContext)

    if (toastReady) {
      toast({
        title: "Settings saved",
        description: "Model path, NVME path, and context settings have been saved",
      })
    }
  }

  const handleStartEngine = async () => {
    setIsLoading(true)

    try {
      const success = await startEngine(modelPath)

      if (success && toastReady) {
        toast({
          title: "Engine started",
          description: "Qwen tensor engine started successfully",
        })
      } else if (toastReady) {
        toast({
          title: "Failed to start engine",
          description: "Check the console for more details",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      if (toastReady) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleStopEngine = async () => {
    setIsLoading(true)

    try {
      const success = await stopEngine()

      if (success && toastReady) {
        toast({
          title: "Engine stopped",
          description: "Qwen tensor engine stopped successfully",
        })
      } else if (toastReady) {
        toast({
          title: "Failed to stop engine",
          description: "Check the console for more details",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      if (toastReady) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Qwen2.5-7B-Instruct-1M Tensor Engine</CardTitle>
            <CardDescription>Maximum context optimization without degradation</CardDescription>
          </div>
          {isRunning && <Badge className="bg-green-500">Running</Badge>}
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="setup">
          <TabsList>
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="context">Context</TabsTrigger>
            <TabsTrigger value="layers">Layer Allocation</TabsTrigger>
            <TabsTrigger value="hardware">Hardware</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="modelPath">Model Path</Label>
              <Input
                id="modelPath"
                value={modelPath}
                onChange={(e) => setModelPath(e.target.value)}
                placeholder="C:\Models\qwen2.5-7b-instruct-1m.gguf"
                disabled={isRunning}
              />
              <p className="text-sm text-muted-foreground">Path to your Qwen2.5-7B-Instruct-1M model</p>
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
              <p className="text-sm text-muted-foreground">Path where tensor layers and context will be cached</p>
            </div>

            <div className="flex items-center space-x-2 mt-4">
              <Switch
                id="useNVMEContext"
                checked={useNVMEContext}
                onCheckedChange={setUseNVMEContext}
                disabled={isRunning}
              />
              <Label htmlFor="useNVMEContext">Use NVME for extended context</Label>
            </div>
            <p className="text-sm text-muted-foreground ml-7">
              Enables storing context beyond RAM capacity on NVME storage
            </p>

            <div className="flex gap-2 mt-4">
              <Button onClick={savePaths} disabled={isRunning || isLoading}>
                Save Settings
              </Button>
              <Button
                onClick={isRunning ? handleStopEngine : handleStartEngine}
                variant={isRunning ? "destructive" : "default"}
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : isRunning ? "Stop Engine" : "Start Engine"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="context" className="mt-4">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <div className="text-sm font-medium">Context Length</div>
                  <div className="text-sm">
                    {context.currentLength.toLocaleString()} / {context.maxLength.toLocaleString()} tokens
                  </div>
                </div>
                <Progress value={context.percentUsed} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {context.percentUsed.toFixed(1)}% of maximum context used
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-md">
                  <h3 className="text-sm font-medium mb-2">KV Cache Distribution</h3>
                  <div className="space-y-1">
                    <div className="text-xs flex justify-between">
                      <span>GPU:</span>
                      <span>
                        {hardware?.gpus?.[0]?.name
                          ? `${Math.floor((hardware.gpus[0].totalMemory - hardware.gpus[0].freeMemory) / 1024 / 1024)} MB`
                          : "N/A"}
                      </span>
                    </div>
                    <div className="text-xs flex justify-between">
                      <span>RAM:</span>
                      <span>
                        {hardware?.ram
                          ? `${Math.floor((hardware.ram.totalGB - hardware.ram.freeGB) * 1024)} MB`
                          : "N/A"}
                      </span>
                    </div>
                    <div className="text-xs flex justify-between">
                      <span>NVME:</span>
                      <span>
                        {hardware?.nvme && context.useNVMEExtension
                          ? `${Math.floor((hardware.nvme.totalGB - hardware.nvme.freeGB) * 1024)} MB`
                          : "Disabled"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-md">
                  <h3 className="text-sm font-medium mb-2">Context Settings</h3>
                  <div className="space-y-1">
                    <div className="text-xs flex justify-between">
                      <span>Max Length:</span>
                      <span>{context.maxLength.toLocaleString()} tokens</span>
                    </div>
                    <div className="text-xs flex justify-between">
                      <span>Sliding Window:</span>
                      <span>8,192 tokens</span>
                    </div>
                    <div className="text-xs flex justify-between">
                      <span>Prefetch Window:</span>
                      <span>1,024 tokens</span>
                    </div>
                    <div className="text-xs flex justify-between">
                      <span>NVME Extension:</span>
                      <span>{context.useNVMEExtension ? "Enabled" : "Disabled"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {context.useNVMEExtension && context.nvmeStatus && (
                <div className="p-4 bg-muted rounded-md">
                  <h3 className="text-sm font-medium mb-2">NVME Context Storage</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-xs flex justify-between">
                        <span>Status:</span>
                        <span>{context.nvmeStatus.isInitialized ? "Initialized" : "Not Initialized"}</span>
                      </div>
                      <div className="text-xs flex justify-between">
                        <span>Total Tokens:</span>
                        <span>{context.nvmeStatus.totalTokens.toLocaleString()}</span>
                      </div>
                      <div className="text-xs flex justify-between">
                        <span>Cached Chunks:</span>
                        <span>{context.nvmeStatus.cachedChunks}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs flex justify-between">
                        <span>NVME Path:</span>
                        <span className="font-mono text-[10px] truncate max-w-[150px]">
                          {context.nvmeStatus.nvmePath}
                        </span>
                      </div>
                      <div className="text-xs flex justify-between">
                        <span>Context Dir:</span>
                        <span className="font-mono text-[10px] truncate max-w-[150px]">
                          {context.nvmeStatus.contextDir}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 bg-muted rounded-md">
                <h3 className="text-sm font-medium mb-2">Context Optimization</h3>
                <p className="text-xs">
                  The tensor engine is using advanced techniques to maximize context length without degradation:
                </p>
                <ul className="text-xs list-disc list-inside mt-2 space-y-1">
                  <li>Hierarchical KV cache management across GPU, RAM, and NVME</li>
                  <li>Sliding window attention for efficient processing of long contexts</li>
                  <li>Prefetching of context windows to minimize latency</li>
                  <li>Compression of NVME-stored cache for efficient storage</li>
                  {context.useNVMEExtension && (
                    <li className="font-semibold">
                      Parallel async processing of NVME-stored context for extended memory
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="layers" className="mt-4">
            {allocation ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <div className="text-sm">Primary GPU Layers (RTX 3070)</div>
                    <span className="text-sm">{allocation.primaryGpu}</span>
                  </div>
                  <Progress value={(allocation.primaryGpu / allocation.total) * 100} className="h-2" />
                  <div className="text-xs text-muted-foreground mt-1">Fastest processing, limited by VRAM</div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <div className="text-sm">Secondary GPU Layers (Quadro P2200)</div>
                    <span className="text-sm">{allocation.secondaryGpu}</span>
                  </div>
                  <Progress value={(allocation.secondaryGpu / allocation.total) * 100} className="h-2" />
                  <div className="text-xs text-muted-foreground mt-1">Fast processing, additional VRAM</div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <div className="text-sm">CPU Layers</div>
                    <span className="text-sm">{allocation.cpu}</span>
                  </div>
                  <Progress value={(allocation.cpu / allocation.total) * 100} className="h-2" />
                  <div className="text-xs text-muted-foreground mt-1">Distributed across CPU cores</div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <div className="text-sm">RAM Layers</div>
                    <span className="text-sm">{allocation.ram}</span>
                  </div>
                  <Progress value={(allocation.ram / allocation.total) * 100} className="h-2" />
                  <div className="text-xs text-muted-foreground mt-1">Medium speed, uses system RAM</div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <div className="text-sm">NVME Layers</div>
                    <span className="text-sm">{allocation.nvme}</span>
                  </div>
                  <Progress value={(allocation.nvme / allocation.total) * 100} className="h-2" />
                  <div className="text-xs text-muted-foreground mt-1">Slowest, but allows running larger models</div>
                </div>

                {allocation.layerMap && Object.keys(allocation.layerMap).length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-2">Layer Distribution</h4>
                    <div className="grid grid-cols-12 gap-1 mt-2">
                      {Array.from({ length: allocation.total }).map((_, i) => {
                        const location = allocation.layerMap[i] || "unknown"
                        const color =
                          location === "primary-gpu"
                            ? "bg-green-500"
                            : location === "secondary-gpu"
                              ? "bg-emerald-500"
                              : location === "cpu"
                                ? "bg-blue-500"
                                : location === "ram"
                                  ? "bg-purple-500"
                                  : "bg-amber-500"

                        return (
                          <div
                            key={i}
                            className={`h-4 rounded ${color} flex items-center justify-center`}
                            title={`Layer ${i}: ${location}`}
                          >
                            <span className="text-[6px] text-white font-bold">{i}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                        <span>Primary GPU</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-emerald-500 rounded mr-1"></div>
                        <span>Secondary GPU</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
                        <span>CPU</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-purple-500 rounded mr-1"></div>
                        <span>RAM</span>
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
                <p className="text-sm text-muted-foreground mt-2">Start the engine to see layer allocation</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="hardware" className="mt-4">
            {hardware ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {hardware.gpus.map((gpu: any, index: number) => (
                    <div key={index} className="p-4 bg-muted rounded-md">
                      <h3 className="text-sm font-medium mb-2">{gpu.name}</h3>
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between mb-1 text-xs">
                            <span>Memory Usage</span>
                            <span>
                              {Math.floor((gpu.totalMemory - gpu.freeMemory) / (1024 * 1024))} MB /
                              {Math.floor(gpu.totalMemory / (1024 * 1024))} MB
                            </span>
                          </div>
                          <Progress
                            value={((gpu.totalMemory - gpu.freeMemory) / gpu.totalMemory) * 100}
                            className="h-1.5"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-md">
                    <h3 className="text-sm font-medium mb-2">CPU</h3>
                    <div className="space-y-2">
                      <div className="text-xs flex justify-between">
                        <span>Cores / Threads:</span>
                        <span>
                          {hardware.cpu.cores} / {hardware.cpu.threads}
                        </span>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1 text-xs">
                          <span>Usage</span>
                          <span>{hardware.cpu.usage}%</span>
                        </div>
                        <Progress value={hardware.cpu.usage} className="h-1.5" />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-md">
                    <h3 className="text-sm font-medium mb-2">RAM</h3>
                    <div className="space-y-2">
                      <div className="text-xs flex justify-between">
                        <span>Total:</span>
                        <span>{hardware.ram.totalGB} GB</span>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1 text-xs">
                          <span>Usage</span>
                          <span>
                            {(hardware.ram.totalGB - hardware.ram.freeGB).toFixed(1)} GB /{hardware.ram.totalGB} GB
                          </span>
                        </div>
                        <Progress value={hardware.ram.usagePercent} className="h-1.5" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-md">
                  <h3 className="text-sm font-medium mb-2">NVME Storage</h3>
                  <div className="space-y-2">
                    <div className="text-xs flex justify-between">
                      <span>Path:</span>
                      <span className="font-mono">{nvmePath || "Not set"}</span>
                    </div>
                    <div className="text-xs flex justify-between">
                      <span>Available:</span>
                      <span>{hardware.nvme.available ? "Yes" : "No"}</span>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1 text-xs">
                        <span>Usage</span>
                        <span>
                          {(hardware.nvme.totalGB - hardware.nvme.freeGB).toFixed(1)} GB /{hardware.nvme.totalGB} GB
                        </span>
                      </div>
                      <Progress value={hardware.nvme.usagePercent} className="h-1.5" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <h3 className="text-lg font-medium">No hardware information</h3>
                <p className="text-sm text-muted-foreground mt-2">Start the engine to see hardware information</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
