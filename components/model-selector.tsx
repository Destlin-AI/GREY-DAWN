"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Brain, FileSearch, Download } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

interface ModelInfo {
  id: string
  name: string
  size: string
  category: string
  path?: string
  format?: string
}

interface ModelSelectorProps {
  status: any
  isLoading: boolean
  onLoadModel: (modelName: string, modelPath?: string) => Promise<void>
}

export function ModelSelector({ status, isLoading, onLoadModel }: ModelSelectorProps) {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [customModelPath, setCustomModelPath] = useState("")
  const [isLoadingModel, setIsLoadingModel] = useState(false)
  const [isFetchingModels, setIsFetchingModels] = useState(false)

  const isRunning = status?.running || false
  const activeModelId = status?.model?.name || null

  // Fetch models when component mounts or server status changes
  useEffect(() => {
    if (isRunning) {
      fetchModels()
    } else {
      // If server is not running, use some default models
      setModels([
        { id: "llama-7b", name: "Llama 7B", size: "7B", category: "small" },
        { id: "llama-13b", name: "Llama 13B", size: "13B", category: "medium" },
        { id: "llama-70b", name: "Llama 70B", size: "70B", category: "large" },
        { id: "mistral-7b", name: "Mistral 7B", size: "7B", category: "small" },
        { id: "mixtral-8x7b", name: "Mixtral 8x7B", size: "65B", category: "large" },
        { id: "phi-3-mini", name: "Phi-3 Mini", size: "3.8B", category: "tiny" },
      ])
    }
  }, [isRunning, status])

  const fetchModels = async () => {
    try {
      setIsFetchingModels(true)

      // In a real implementation, fetch from your API
      // For now, use mock data
      const mockModels = [
        { id: "llama-7b", name: "Llama 7B", size: "7B", category: "small" },
        { id: "llama-13b", name: "Llama 13B", size: "13B", category: "medium" },
        { id: "llama-70b", name: "Llama 70B", size: "70B", category: "large" },
        { id: "mistral-7b", name: "Mistral 7B", size: "7B", category: "small" },
        { id: "mixtral-8x7b", name: "Mixtral 8x7B", size: "65B", category: "large" },
        { id: "phi-3-mini", name: "Phi-3 Mini", size: "3.8B", category: "tiny" },
      ]

      setModels(mockModels)

      // If there's an active model, select it
      if (activeModelId) {
        setSelectedModel(activeModelId)
      }
    } catch (error) {
      console.error("Error fetching models:", error)
      toast({
        title: "Failed to fetch models",
        description: "Could not retrieve the list of available models",
        variant: "destructive",
      })
    } finally {
      setIsFetchingModels(false)
    }
  }

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId === selectedModel ? null : modelId)
    setCustomModelPath("") // Clear custom path when selecting a model
  }

  const handleLoadModel = async () => {
    if (!selectedModel && !customModelPath) {
      toast({
        title: "No model selected",
        description: "Please select a model or provide a custom model path",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoadingModel(true)

      if (customModelPath) {
        await onLoadModel("", customModelPath)
      } else if (selectedModel) {
        await onLoadModel(selectedModel)
      }

      toast({
        title: "Model loaded",
        description: `Model has been loaded successfully`,
      })
    } catch (error: any) {
      toast({
        title: "Failed to load model",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoadingModel(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-400">Available Models</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchModels}
            disabled={!isRunning || isFetchingModels}
            className="h-8 gap-1 text-xs"
          >
            <Loader2 className={`h-3 w-3 ${isFetchingModels ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <ScrollArea className="h-[300px] rounded-md border border-slate-800 bg-slate-900/50">
          <div className="p-4">
            {models.length === 0 ? (
              <div className="flex h-20 items-center justify-center text-sm text-slate-500">
                {isFetchingModels ? "Loading models..." : "No models available"}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {models.map((model) => (
                  <div
                    key={model.id}
                    className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                      selectedModel === model.id
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                    } ${activeModelId === model.id ? "ring-2 ring-emerald-500/30" : ""}`}
                    onClick={() => handleModelSelect(model.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain
                          className={`h-5 w-5 ${selectedModel === model.id ? "text-blue-400" : "text-slate-400"}`}
                        />
                        <span className="font-medium">{model.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-slate-700 bg-slate-800">
                          {model.size}
                        </Badge>
                        {activeModelId === model.id && <Badge className="bg-emerald-600">Active</Badge>}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{model.category} model</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-400">Custom Model</h3>
        <div className="flex gap-2">
          <Input
            placeholder="C:\Models\custom-model.gguf"
            value={customModelPath}
            onChange={(e) => {
              setCustomModelPath(e.target.value)
              setSelectedModel(null) // Clear selection when typing custom path
            }}
            disabled={!isRunning || isLoadingModel}
            className="bg-slate-900"
          />
          <Button variant="outline" size="icon" disabled={!isRunning || isLoadingModel}>
            <FileSearch className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleLoadModel}
          disabled={!isRunning || isLoadingModel || (!selectedModel && !customModelPath)}
          className="flex-1 gap-2"
        >
          {isLoadingModel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Load Model
        </Button>
      </div>

      {status?.model && (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="p-4">
            <h3 className="mb-2 text-sm font-medium text-slate-400">Current Model</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Name</span>
                <span className="text-sm">{status.model.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Size</span>
                <span className="text-sm">{status.model.size || "Unknown"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Category</span>
                <span className="text-sm">{status.model.category || "Unknown"}</span>
              </div>
              {status.model.parameters && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Parameters</span>
                  <span className="text-sm">{status.model.parameters}B</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
