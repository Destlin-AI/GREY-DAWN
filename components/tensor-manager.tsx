"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Cpu, HardDrive, MemoryStick, Server, AlertTriangle, X, RefreshCw, Zap } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useTensorEngine } from "@/hooks/use-tensor-engine"

export function TensorManager() {
  const { toast } = useToast()
  const {
    status,
    isLoading,
    error,
    startEngine,
    stopEngine,
    detectHardware,
    setNvmePath,
    simulateInference,
    clearError,
  } = useTensorEngine({
    autoDetectOnMount: true,
  })

  const [modelName, setModelName] = useState("llama-7b")
  const [nvmePath, setNvmePathState] = useState("")
  const [prompt, setPrompt] = useState("")
  const [response, setResponse] = useState("")
  const [inferenceLoading, setInferenceLoading] = useState(false)

  // Update NVME path from local storage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPath = localStorage.getItem("nvmePath") || ""
      setNvmePathState(savedPath)
    }
  }, [])

  // Update NVME path
  const handleNvmePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const path = e.target.value
    setNvmePathState(path)
  }

  const handleNvmePathSave = () => {
    setNvmePath(nvmePath)
    localStorage.setItem("nvmePath", nvmePath)
    toast({
      title: "NVME path updated",
      description: `Path set to: ${nvmePath}`,
    })
  }

  // Toggle tensor system
  const toggleTensorSystem = async () => {
    if (status?.isRunning) {
      const success = await stopEngine()
      if (success) {
        toast({
          title: "Tensor system deactivated",
          description: "Hardware acceleration disabled",
        })
      }
    } else {
      const success = await startEngine(modelName)
      if (success) {
        toast({
          title: "Tensor system activated",
          description: `Optimized for ${modelName} with ${status?.allocation?.total || 0} layers`,
        })
      }
    }
  }

  // Handle model change
  const handleModelChange = (value: string) => {
    setModelName(value)
  }

  // Handle inference
  const handleInference = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Empty prompt",
        description: "Please enter a prompt to generate a response",
        variant: "destructive",
      })
      return
    }

    setInferenceLoading(true)
    setResponse("")

    try {
      const result = await simulateInference(prompt, { maxTokens: 100 })
      setResponse(result)
    } catch (err) {
      toast({
        title: "Inference failed",
        description: error || "Failed to generate response",
        variant: "destructive",
      })
    } finally {
      setInferenceLoading(false)
    }
  }

  // Safe accessors for status properties
  const isRunning = status?.isRunning || false
  const allocation = status?.allocation || { gpu: 0, cpu: 0, ram: 0, nvme: 0, total: 0 }
  const hardware = status?.hardware
  const model = status?.model

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            <CardTitle>Tensor Acceleration System</CardTitle>
            {isRunning && <Badge className="ml-2 bg-green-500">Active</Badge>}
          </div>
          <Button variant="outline" size="sm" onClick={() => detectHardware()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <CardDescription>
          Optimize model performance by distributing layers across GPU, CPU, RAM, and NVME
        </CardDescription>
      </CardHeader>

      {error && (
        <div className="px-6 mb-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="flex justify-between items-center">
              <span>{error}</span>
              <Button variant="ghost" size="sm" onClick={clearError}>
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <CardContent>
        <Tabs defaultValue="status">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="layers">Layer Allocation</TabsTrigger>
            <TabsTrigger value="hardware">Hardware</TabsTrigger>
            <TabsTrigger value="test">Test</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Tensor Acceleration</Label>
                  <div className="text-sm text-muted-foreground">Optimize model performance across hardware</div>
                </div>
                <Switch checked={isRunning} onCheckedChange={toggleTensorSystem} disabled={isLoading} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Model Selection</Label>
                  <div className="text-sm text-muted-foreground">Choose the model to optimize</div>
                </div>
                <Select value={modelName} onValueChange={handleModelChange} disabled={isRunning || isLoading}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="llama-7b">Llama 7B</SelectItem>
                    <SelectItem value="mixtral-8x7b">Mixtral 8x7B</SelectItem>
                    <SelectItem value="llama-13b">Llama 13B</SelectItem>
                    <SelectItem value="llama-70b">Llama 70B</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>NVME Storage Path</Label>
                <div className="flex space-x-2">
                  <Input
                    value={nvmePath}
                    onChange={handleNvmePathChange}
                    placeholder="Path to NVME storage (e.g., C:\nvme_cache)"
                    disabled={isRunning}
                  />
                  <Button onClick={handleNvmePathSave} disabled={isRunning}>
                    Save
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  Set the path where model layers will be stored on disk
                </div>
              </div>

              {isRunning && model && (
                <div className="mt-4 p-4 bg-muted rounded-md">
                  <h4 className="font-medium mb-2">Active Configuration</h4>
                  <div className="text-sm space-y-1">
                    <div>Model: {model.name}</div>
                    <div>
                      Size: {model.size} ({model.category})
                    </div>
                    <div>Total Layers: {allocation.total}</div>
                    <div>Hidden Size: {model.hiddenSize}</div>
                    <div>Vocabulary Size: {model.vocabSize}</div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="layers" className="mt-4">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <div className="flex items-center gap-1 text-sm">
                    <Cpu className="h-4 w-4" /> GPU Layers
                  </div>
                  <span className="text-sm">{allocation.gpu}</span>
                </div>
                <Progress
                  value={allocation.total > 0 ? (allocation.gpu / allocation.total) * 100 : 0}
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground mt-1">Fastest processing, limited by VRAM</div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <div className="flex items-center gap-1 text-sm">
                    <Cpu className="h-4 w-4" /> CPU Layers
                  </div>
                  <span className="text-sm">{allocation.cpu}</span>
                </div>
                <Progress
                  value={allocation.total > 0 ? (allocation.cpu / allocation.total) * 100 : 0}
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground mt-1">Medium speed, uses processor cores</div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <div className="flex items-center gap-1 text-sm">
                    <MemoryStick className="h-4 w-4" /> RAM Layers
                  </div>
                  <span className="text-sm">{allocation.ram}</span>
                </div>
                <Progress
                  value={allocation.total > 0 ? (allocation.ram / allocation.total) * 100 : 0}
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground mt-1">Slower than CPU, but faster than disk</div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <div className="flex items-center gap-1 text-sm">
                    <HardDrive className="h-4 w-4" /> NVME Layers
                  </div>
                  <span className="text-sm">{allocation.nvme}</span>
                </div>
                <Progress
                  value={allocation.total > 0 ? (allocation.nvme / allocation.total) * 100 : 0}
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground mt-1">Slowest, but allows running larger models</div>
              </div>

              <div className="p-4 bg-muted rounded-md mt-6">
                <h4 className="font-medium mb-2">What are layers?</h4>
                <p className="text-sm text-muted-foreground">
                  Large language models are made up of many layers. The tensor system distributes these layers across
                  your hardware for optimal performance. GPU layers are fastest, followed by CPU, RAM, and NVME storage.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="hardware" className="mt-4">
            {!hardware ? (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <AlertTriangle className="h-10 w-10 text-yellow-500 mb-4" />
                <h3 className="text-lg font-medium">Hardware not detected</h3>
                <p className="text-sm text-muted-foreground mt-2 mb-4">
                  Click the "Detect Hardware" button to scan your system
                </p>
                <Button onClick={() => detectHardware()}>Detect Hardware</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">GPU</h4>
                  {hardware.gpu?.available ? (
                    <div className="space-y-2">
                      <div className="text-sm">Count: {hardware.gpu.count}</div>
                      {hardware.gpu.devices?.map((gpu, index) => (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>
                              GPU {gpu.id}: {gpu.name}
                            </span>
                            <span>
                              {((gpu.totalMemory - gpu.freeMemory) / (1024 * 1024)).toFixed(0)}MB /
                              {(gpu.totalMemory / (1024 * 1024)).toFixed(0)}MB
                            </span>
                          </div>
                          <Progress
                            value={((gpu.totalMemory - gpu.freeMemory) / gpu.totalMemory) * 100}
                            className="h-2"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No GPU detected</div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">CPU</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Usage: {hardware.cpu?.usage?.toFixed(1) || 0}%</span>
                      <span>
                        Cores: {hardware.cpu?.cores || 0} / Threads: {hardware.cpu?.threads || 0}
                      </span>
                    </div>
                    <Progress value={hardware.cpu?.usage || 0} className="h-2" />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">RAM</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>
                        Usage: {((hardware.ram?.totalGB || 0) - (hardware.ram?.freeGB || 0)).toFixed(1)}GB /
                        {hardware.ram?.totalGB?.toFixed(1) || 0}GB
                      </span>
                      <span>{hardware.ram?.usagePercent?.toFixed(1) || 0}%</span>
                    </div>
                    <Progress value={hardware.ram?.usagePercent || 0} className="h-2" />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">NVME Storage</h4>
                  {hardware.nvme?.available ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>
                          Usage: {((hardware.nvme?.totalGB || 0) - (hardware.nvme?.freeGB || 0)).toFixed(1)}GB /
                          {hardware.nvme?.totalGB?.toFixed(1) || 0}GB
                        </span>
                        <span>{hardware.nvme?.usagePercent?.toFixed(1) || 0}%</span>
                      </div>
                      <Progress value={hardware.nvme?.usagePercent || 0} className="h-2" />
                      <div className="text-xs mt-1">
                        Path: {nvmePath || "Not set"}
                        {hardware.nvme?.pathExists ? (
                          <Badge className="ml-2 bg-green-500">Valid</Badge>
                        ) : (
                          <Badge className="ml-2 bg-red-500">Invalid</Badge>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">NVME path not configured</div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="test" className="mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="prompt">Test Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="Enter a prompt to test the tensor engine..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="mt-1"
                  rows={3}
                  disabled={!isRunning || inferenceLoading}
                />
              </div>

              <Button
                onClick={handleInference}
                disabled={!isRunning || !prompt.trim() || inferenceLoading}
                className="w-full"
              >
                {inferenceLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Run Inference
                  </>
                )}
              </Button>

              {response && (
                <div className="p-4 bg-muted rounded-md mt-2">
                  <h4 className="font-medium mb-2">Response:</h4>
                  <p className="text-sm whitespace-pre-wrap">{response}</p>
                </div>
              )}

              {!isRunning && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Tensor engine not active</AlertTitle>
                  <AlertDescription>You need to activate the tensor engine before testing inference.</AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex justify-between border-t pt-4">
        <div className="text-xs text-muted-foreground">
          {isRunning
            ? `Running ${modelName} with ${allocation.gpu} GPU, ${allocation.cpu} CPU, ${allocation.ram} RAM, and ${allocation.nvme} NVME layers`
            : "Tensor engine inactive"}
        </div>
        <Button variant="outline" size="sm" onClick={toggleTensorSystem} disabled={isLoading}>
          {isRunning ? "Deactivate" : "Activate"}
        </Button>
      </CardFooter>
    </Card>
  )
}
