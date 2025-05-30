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
import { useWebGPUTensor } from "@/hooks/use-webgpu-tensor"

export function WebGPUTensorManager() {
  const { toast } = useToast()
  const { status, isLoading, error, initialize, startEngine, stopEngine, setStoragePath, runInference, clearError } =
    useWebGPUTensor({
      autoInitialize: true,
    })

  const [modelName, setModelName] = useState("llama-7b")
  const [storagePath, setStoragePathState] = useState("")
  const [inputText, setInputText] = useState("")
  const [outputText, setOutputText] = useState("")
  const [inferenceLoading, setInferenceLoading] = useState(false)

  // Update storage path from local storage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPath = localStorage.getItem("tensorStoragePath") || ""
      setStoragePathState(savedPath)
    }
  }, [])

  // Update storage path
  const handleStoragePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const path = e.target.value
    setStoragePathState(path)
  }

  const handleStoragePathSave = () => {
    setStoragePath(storagePath)
    localStorage.setItem("tensorStoragePath", storagePath)
    toast({
      title: "Storage path updated",
      description: `Path set to: ${storagePath}`,
    })
  }

  // Toggle tensor system
  const toggleTensorSystem = async () => {
    if (status.isRunning) {
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
          description: `Optimized for ${modelName} with ${status.allocation.total} layers`,
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
    if (!inputText.trim()) {
      toast({
        title: "Empty input",
        description: "Please enter some text to process",
        variant: "destructive",
      })
      return
    }

    setInferenceLoading(true)
    setOutputText("")

    try {
      // Convert input text to a tensor (simplified for demo)
      const inputTensor = new Float32Array(1024).fill(0)
      for (let i = 0; i < Math.min(inputText.length, 1024); i++) {
        inputTensor[i] = inputText.charCodeAt(i) / 255
      }

      // Run inference
      const outputTensor = await runInference(inputTensor)

      // Convert output tensor to text (simplified for demo)
      let output = "Processed output tensor:\n"
      for (let i = 0; i < Math.min(10, outputTensor.length); i++) {
        output += `[${i}]: ${outputTensor[i].toFixed(4)}\n`
      }
      output += `... (${outputTensor.length} values total)`

      setOutputText(output)
    } catch (err) {
      toast({
        title: "Inference failed",
        description: error || "Failed to process input",
        variant: "destructive",
      })
    } finally {
      setInferenceLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            <CardTitle>WebGPU Tensor Acceleration</CardTitle>
            {status.isRunning && <Badge className="ml-2 bg-green-500">Active</Badge>}
          </div>
          <Button variant="outline" size="sm" onClick={() => initialize()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <CardDescription>Hardware-accelerated tensor operations using WebGPU on your RTX 3070</CardDescription>
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
                  <Label>WebGPU Tensor Acceleration</Label>
                  <div className="text-sm text-muted-foreground">Optimize model performance with your RTX 3070</div>
                </div>
                <Switch
                  checked={status.isRunning}
                  onCheckedChange={toggleTensorSystem}
                  disabled={isLoading || !status.isInitialized}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Model Selection</Label>
                  <div className="text-sm text-muted-foreground">Choose the model to optimize</div>
                </div>
                <Select value={modelName} onValueChange={handleModelChange} disabled={status.isRunning || isLoading}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="llama-7b">Llama 7B</SelectItem>
                    <SelectItem value="mixtral-8x7b">Mixtral 8x7B</SelectItem>
                    <SelectItem value="qwen-14b">Qwen 14B</SelectItem>
                    <SelectItem value="llama-70b">Llama 70B</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Storage Path</Label>
                <div className="flex space-x-2">
                  <Input
                    value={storagePath}
                    onChange={handleStoragePathChange}
                    placeholder="Path to storage (e.g., C:\tensor_storage)"
                    disabled={status.isRunning}
                  />
                  <Button onClick={handleStoragePathSave} disabled={status.isRunning}>
                    Save
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  Set the path where model layers will be stored on disk
                </div>
              </div>

              {status.isRunning && status.model && (
                <div className="mt-4 p-4 bg-muted rounded-md">
                  <h4 className="font-medium mb-2">Active Configuration</h4>
                  <div className="text-sm space-y-1">
                    <div>Model: {status.model.name}</div>
                    <div>
                      Size: {status.model.size} ({status.model.category})
                    </div>
                    <div>Total Layers: {status.allocation.total}</div>
                    <div>Hidden Size: {status.model.hiddenSize}</div>
                    <div>Vocabulary Size: {status.model.vocabSize}</div>
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
                    <Cpu className="h-4 w-4" /> GPU Layers (RTX 3070)
                  </div>
                  <span className="text-sm">{status.allocation.gpu}</span>
                </div>
                <Progress
                  value={status.allocation.total > 0 ? (status.allocation.gpu / status.allocation.total) * 100 : 0}
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground mt-1">Fastest processing, limited by VRAM</div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <div className="flex items-center gap-1 text-sm">
                    <MemoryStick className="h-4 w-4" /> CPU Layers
                  </div>
                  <span className="text-sm">{status.allocation.cpu}</span>
                </div>
                <Progress
                  value={status.allocation.total > 0 ? (status.allocation.cpu / status.allocation.total) * 100 : 0}
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground mt-1">Medium speed, uses system RAM</div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <div className="flex items-center gap-1 text-sm">
                    <HardDrive className="h-4 w-4" /> Storage Layers
                  </div>
                  <span className="text-sm">{status.allocation.storage}</span>
                </div>
                <Progress
                  value={status.allocation.total > 0 ? (status.allocation.storage / status.allocation.total) * 100 : 0}
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground mt-1">Slowest, but allows running larger models</div>
              </div>

              {status.isRunning && status.layers && status.layers.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-2">Layer Distribution</h4>
                  <div className="grid grid-cols-10 gap-1 mt-2">
                    {Array.from({ length: status.allocation.total }).map((_, i) => {
                      const layer = status.layers.find((l) => l.id === i)
                      const color =
                        layer?.location === "gpu"
                          ? "bg-green-500"
                          : layer?.location === "cpu"
                            ? "bg-blue-500"
                            : "bg-amber-500"

                      return (
                        <div
                          key={i}
                          className={`h-4 rounded ${color} flex items-center justify-center`}
                          title={`Layer ${i}: ${layer?.location || "unknown"}`}
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
                      <span>Storage</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 bg-muted rounded-md mt-6">
                <h4 className="font-medium mb-2">What are layers?</h4>
                <p className="text-sm text-muted-foreground">
                  Large language models are made up of many transformer layers. The tensor system distributes these
                  layers across your hardware for optimal performance. GPU layers are fastest, followed by CPU, and
                  storage layers.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="hardware" className="mt-4">
            {!status.hardware ? (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <AlertTriangle className="h-10 w-10 text-yellow-500 mb-4" />
                <h3 className="text-lg font-medium">Hardware not detected</h3>
                <p className="text-sm text-muted-foreground mt-2 mb-4">
                  Click the "Initialize" button to scan your system
                </p>
                <Button onClick={() => initialize()}>Initialize</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">GPU</h4>
                  {status.hardware.gpu.available ? (
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium">Name:</span> {status.hardware.gpu.name}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Vendor:</span> {status.hardware.gpu.vendor}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Max Buffer Size:</span>{" "}
                        {(status.hardware.gpu.limits.maxBufferSize / (1024 * 1024 * 1024)).toFixed(2)} GB
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Max Storage Buffer Size:</span>{" "}
                        {(status.hardware.gpu.limits.maxStorageBufferBindingSize / (1024 * 1024 * 1024)).toFixed(2)} GB
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No WebGPU-compatible GPU detected</div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">System Memory</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Total: {status.hardware.memory.totalGb.toFixed(1)} GB</span>
                      <span>Used: {status.hardware.memory.usedGb.toFixed(1)} GB</span>
                    </div>
                    <Progress
                      value={(status.hardware.memory.usedGb / status.hardware.memory.totalGb) * 100}
                      className="h-2"
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Storage</h4>
                  {status.hardware.storage.available ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Total: {status.hardware.storage.totalGb.toFixed(1)} GB</span>
                        <span>Free: {status.hardware.storage.freeGb.toFixed(1)} GB</span>
                      </div>
                      <Progress
                        value={
                          ((status.hardware.storage.totalGb - status.hardware.storage.freeGb) /
                            status.hardware.storage.totalGb) *
                          100
                        }
                        className="h-2"
                      />
                      <div className="text-xs mt-1">Path: {status.hardware.storage.path || "Not set"}</div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Storage path not configured</div>
                  )}
                </div>

                <div className="p-4 bg-muted rounded-md mt-4">
                  <h4 className="font-medium mb-2">WebGPU Status</h4>
                  <div className="flex items-center gap-2">
                    <Badge className={status.isInitialized ? "bg-green-500" : "bg-amber-500"}>
                      {status.isInitialized ? "Initialized" : "Not Initialized"}
                    </Badge>
                    {status.isInitialized && (
                      <span className="text-sm text-muted-foreground">
                        WebGPU is properly initialized and ready to use
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="test" className="mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="input">Test Input</Label>
                <Textarea
                  id="input"
                  placeholder="Enter text to process with the tensor engine..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="mt-1"
                  rows={3}
                  disabled={!status.isRunning || inferenceLoading}
                />
              </div>

              <Button
                onClick={handleInference}
                disabled={!status.isRunning || !inputText.trim() || inferenceLoading}
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
                    Run Tensor Processing
                  </>
                )}
              </Button>

              {outputText && (
                <div className="p-4 bg-muted rounded-md mt-2">
                  <h4 className="font-medium mb-2">Output:</h4>
                  <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-40">{outputText}</pre>
                </div>
              )}

              {!status.isRunning && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Tensor engine not active</AlertTitle>
                  <AlertDescription>You need to activate the tensor engine before testing.</AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex justify-between border-t pt-4">
        <div className="text-xs text-muted-foreground">
          {status.isRunning
            ? `Running ${modelName} with ${status.allocation.gpu} GPU, ${status.allocation.cpu} CPU, and ${status.allocation.storage} storage layers`
            : "Tensor engine inactive"}
        </div>
        <Button variant="outline" size="sm" onClick={toggleTensorSystem} disabled={isLoading || !status.isInitialized}>
          {status.isRunning ? "Deactivate" : "Activate"}
        </Button>
      </CardFooter>
    </Card>
  )
}
