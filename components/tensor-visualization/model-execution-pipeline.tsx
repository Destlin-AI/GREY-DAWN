"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play, Pause, RotateCcw } from "lucide-react"
import { useModel, useLayers } from "@/hooks/use-tensor-api"

interface PipelineStage {
  id: string
  name: string
  status: "pending" | "loading" | "processing" | "completed" | "error"
  progress: number
  layerId?: number
  startTime?: number
  endTime?: number
  memoryUsage?: number
  computeTime?: number
}

interface ExecutionMetrics {
  totalLayers: number
  processedLayers: number
  currentLayer: number
  totalTime: number
  averageLayerTime: number
  memoryPeak: number
  throughput: number // tokens/second
}

export function ModelExecutionPipeline() {
  const { model, generateText } = useModel()
  const { layers } = useLayers()
  const [isExecuting, setIsExecuting] = useState(false)
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [metrics, setMetrics] = useState<ExecutionMetrics>({
    totalLayers: 0,
    processedLayers: 0,
    currentLayer: 0,
    totalTime: 0,
    averageLayerTime: 0,
    memoryPeak: 0,
    throughput: 0,
  })
  const [executionLog, setExecutionLog] = useState<string[]>([])
  const intervalRef = useRef<NodeJS.Timeout>()

  // Initialize pipeline stages from loaded model layers
  useEffect(() => {
    if (model && model.status === "loaded" && layers.length > 0) {
      const modelLayers = layers
        .filter(
          (layer) =>
            // Filter layers that belong to the current model
            layer.name.includes("layer") || layer.name.includes("block"),
        )
        .sort((a, b) => a.id - b.id)

      const pipelineStages: PipelineStage[] = [
        {
          id: "tokenization",
          name: "Tokenization",
          status: "pending",
          progress: 0,
        },
        {
          id: "embedding",
          name: "Input Embedding",
          status: "pending",
          progress: 0,
        },
        ...modelLayers.map((layer, index) => ({
          id: `layer_${layer.id}`,
          name: `Layer ${index + 1}: ${layer.name.split(".").pop() || "Unknown"}`,
          status: "pending" as const,
          progress: 0,
          layerId: layer.id,
        })),
        {
          id: "output",
          name: "Output Generation",
          status: "pending",
          progress: 0,
        },
        {
          id: "detokenization",
          name: "Detokenization",
          status: "pending",
          progress: 0,
        },
      ]

      setStages(pipelineStages)
      setMetrics((prev) => ({
        ...prev,
        totalLayers: modelLayers.length,
      }))
    }
  }, [model, layers])

  // Simulate execution pipeline
  const simulateExecution = async (prompt = "Hello, world!") => {
    if (!model || model.status !== "loaded" || isExecuting) return

    setIsExecuting(true)
    setExecutionLog([])
    const startTime = Date.now()

    try {
      // Reset all stages
      setStages((prev) =>
        prev.map((stage) => ({
          ...stage,
          status: "pending",
          progress: 0,
          startTime: undefined,
          endTime: undefined,
        })),
      )

      // Process each stage
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i]
        const stageStartTime = Date.now()

        // Update stage to loading
        setStages((prev) =>
          prev.map((s, idx) => (idx === i ? { ...s, status: "loading", startTime: stageStartTime } : s)),
        )

        setExecutionLog((prev) => [...prev, `Starting ${stage.name}...`])

        // Simulate stage processing with progress updates
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise((resolve) => setTimeout(resolve, 50))

          setStages((prev) => prev.map((s, idx) => (idx === i ? { ...s, progress } : s)))

          // Update metrics
          if (stage.layerId) {
            setMetrics((prev) => ({
              ...prev,
              currentLayer: i - 1, // Adjust for non-layer stages
              processedLayers: Math.max(0, i - 2), // Adjust for tokenization and embedding
            }))
          }
        }

        const stageEndTime = Date.now()
        const stageTime = stageEndTime - stageStartTime

        // Complete stage
        setStages((prev) =>
          prev.map((s, idx) =>
            idx === i
              ? {
                  ...s,
                  status: "completed",
                  progress: 100,
                  endTime: stageEndTime,
                  computeTime: stageTime,
                }
              : s,
          ),
        )

        setExecutionLog((prev) => [...prev, `Completed ${stage.name} in ${stageTime}ms`])

        // Simulate memory usage
        const memoryUsage = Math.random() * 1000 + 500 // 500-1500 MB
        setMetrics((prev) => ({
          ...prev,
          memoryPeak: Math.max(prev.memoryPeak, memoryUsage),
        }))
      }

      // Final metrics calculation
      const totalTime = Date.now() - startTime
      const avgLayerTime = totalTime / Math.max(1, stages.length - 4) // Exclude non-layer stages

      setMetrics((prev) => ({
        ...prev,
        totalTime,
        averageLayerTime: avgLayerTime,
        throughput: (prompt.length / totalTime) * 1000, // chars per second
      }))

      setExecutionLog((prev) => [...prev, `Pipeline completed in ${totalTime}ms`])
    } catch (error) {
      setExecutionLog((prev) => [...prev, `Error: ${error}`])

      // Mark current stage as error
      setStages((prev) => prev.map((stage) => (stage.status === "loading" ? { ...stage, status: "error" } : stage)))
    } finally {
      setIsExecuting(false)
    }
  }

  const resetPipeline = () => {
    setStages((prev) =>
      prev.map((stage) => ({
        ...stage,
        status: "pending",
        progress: 0,
        startTime: undefined,
        endTime: undefined,
      })),
    )
    setMetrics({
      totalLayers: metrics.totalLayers,
      processedLayers: 0,
      currentLayer: 0,
      totalTime: 0,
      averageLayerTime: 0,
      memoryPeak: 0,
      throughput: 0,
    })
    setExecutionLog([])
  }

  const getStageColor = (status: PipelineStage["status"]) => {
    switch (status) {
      case "pending":
        return "bg-gray-200"
      case "loading":
        return "bg-blue-500"
      case "processing":
        return "bg-yellow-500"
      case "completed":
        return "bg-green-500"
      case "error":
        return "bg-red-500"
      default:
        return "bg-gray-200"
    }
  }

  const getStageIcon = (status: PipelineStage["status"]) => {
    switch (status) {
      case "loading":
      case "processing":
        return <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
      case "completed":
        return <div className="h-4 w-4 rounded-full bg-white" />
      case "error":
        return (
          <div className="h-4 w-4 rounded-full bg-white flex items-center justify-center text-red-500 text-xs">!</div>
        )
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-400" />
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Model Execution Pipeline
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => simulateExecution()}
              disabled={!model || model.status !== "loaded" || isExecuting}
            >
              {isExecuting ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isExecuting ? "Running" : "Start"}
            </Button>
            <Button size="sm" variant="outline" onClick={resetPipeline}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Execution Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {metrics.processedLayers}/{metrics.totalLayers}
            </div>
            <div className="text-sm text-muted-foreground">Layers Processed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{metrics.totalTime.toFixed(0)}ms</div>
            <div className="text-sm text-muted-foreground">Total Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{metrics.memoryPeak.toFixed(0)}MB</div>
            <div className="text-sm text-muted-foreground">Memory Peak</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{metrics.throughput.toFixed(1)}</div>
            <div className="text-sm text-muted-foreground">Chars/sec</div>
          </div>
        </div>

        {/* Pipeline Visualization */}
        <div className="space-y-2">
          <h4 className="font-semibold">Pipeline Stages</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {stages.map((stage, index) => (
              <div key={stage.id} className="flex items-center gap-3 p-2 rounded-lg border">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStageColor(stage.status)}`}>
                  {getStageIcon(stage.status)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{stage.name}</span>
                    <Badge variant="outline" className="ml-2">
                      {stage.status}
                    </Badge>
                  </div>

                  {stage.status !== "pending" && (
                    <div className="mt-1">
                      <Progress value={stage.progress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{stage.progress}%</span>
                        {stage.computeTime && <span>{stage.computeTime}ms</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Execution Log */}
        <div className="space-y-2">
          <h4 className="font-semibold">Execution Log</h4>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 max-h-32 overflow-y-auto">
            <div className="space-y-1 text-sm font-mono">
              {executionLog.length === 0 ? (
                <div className="text-muted-foreground">No execution data</div>
              ) : (
                executionLog.map((log, index) => (
                  <div key={index} className="text-xs">
                    <span className="text-muted-foreground">[{new Date().toLocaleTimeString()}]</span> {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Model Status */}
        {model && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span>Model: {model.model_name || "Unknown"}</span>
              <Badge variant={model.status === "loaded" ? "default" : "secondary"}>{model.status}</Badge>
            </div>
            {model.compute_device && (
              <div className="text-xs text-muted-foreground mt-1">Compute Device: {model.compute_device}</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
