"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Save, RotateCw } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface ConfigEditorProps {
  status: any
  isLoading: boolean
  onUpdateConfig: (config: any) => Promise<void>
}

export function ConfigEditor({ status, isLoading, onUpdateConfig }: ConfigEditorProps) {
  const [activeTab, setActiveTab] = useState("ui")
  const [isUpdating, setIsUpdating] = useState(false)

  // UI form state
  const [contextSize, setContextSize] = useState(2048)
  const [batchSize, setBatchSize] = useState(1)
  const [threads, setThreads] = useState(4)
  const [gpuLayers, setGpuLayers] = useState(20)
  const [useNvme, setUseNvme] = useState(true)
  const [quantization, setQuantization] = useState("4bit")

  // JSON editor state
  const [jsonConfig, setJsonConfig] = useState("")

  // Initialize form values from status
  useEffect(() => {
    if (status?.config) {
      const config = status.config
      setContextSize(config.context_size || 2048)
      setBatchSize(config.batch_size || 1)
      setThreads(config.threads || 4)
      setGpuLayers(config.gpu_layers || 20)
      setUseNvme(config.use_nvme !== undefined ? config.use_nvme : true)
      setQuantization(config.quantization || "4bit")

      // Format JSON for the editor
      setJsonConfig(JSON.stringify(config, null, 2))
    }
  }, [status])

  const handleSaveUI = async () => {
    try {
      setIsUpdating(true)

      const config = {
        context_size: contextSize,
        batch_size: batchSize,
        threads: threads,
        gpu_layers: gpuLayers,
        use_nvme: useNvme,
        quantization: quantization,
      }

      await onUpdateConfig(config)

      toast({
        title: "Configuration updated",
        description: "The tensor server configuration has been updated",
      })
    } catch (error: any) {
      toast({
        title: "Failed to update configuration",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSaveJSON = async () => {
    try {
      setIsUpdating(true)

      // Parse JSON to validate it
      const config = JSON.parse(jsonConfig)

      await onUpdateConfig(config)

      toast({
        title: "Configuration updated",
        description: "The tensor server configuration has been updated",
      })
    } catch (error: any) {
      toast({
        title: "Failed to update configuration",
        description:
          error instanceof SyntaxError ? "Invalid JSON format" : error.message || "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonConfig)
      setJsonConfig(JSON.stringify(parsed, null, 2))
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "The JSON could not be formatted because it is invalid",
        variant: "destructive",
      })
    }
  }

  return (
    <Tabs defaultValue="ui" onValueChange={setActiveTab} value={activeTab}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="ui" className="data-[state=active]:bg-slate-800">
          UI Editor
        </TabsTrigger>
        <TabsTrigger value="json" className="data-[state=active]:bg-slate-800">
          JSON Editor
        </TabsTrigger>
      </TabsList>

      <TabsContent value="ui" className="space-y-6 pt-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="context-size" className="text-sm">
                Context Size
              </Label>
              <span className="text-sm">{contextSize} tokens</span>
            </div>
            <Slider
              id="context-size"
              min={512}
              max={8192}
              step={512}
              value={[contextSize]}
              onValueChange={(value) => setContextSize(value[0])}
              disabled={isLoading || isUpdating || !status?.running}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="batch-size" className="text-sm">
                Batch Size
              </Label>
              <span className="text-sm">{batchSize}</span>
            </div>
            <Slider
              id="batch-size"
              min={1}
              max={8}
              step={1}
              value={[batchSize]}
              onValueChange={(value) => setBatchSize(value[0])}
              disabled={isLoading || isUpdating || !status?.running}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="threads" className="text-sm">
                CPU Threads
              </Label>
              <span className="text-sm">{threads}</span>
            </div>
            <Slider
              id="threads"
              min={1}
              max={32}
              step={1}
              value={[threads]}
              onValueChange={(value) => setThreads(value[0])}
              disabled={isLoading || isUpdating || !status?.running}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="gpu-layers" className="text-sm">
                GPU Layers
              </Label>
              <span className="text-sm">{gpuLayers}</span>
            </div>
            <Slider
              id="gpu-layers"
              min={0}
              max={100}
              step={1}
              value={[gpuLayers]}
              onValueChange={(value) => setGpuLayers(value[0])}
              disabled={isLoading || isUpdating || !status?.running}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="use-nvme" className="text-sm">
                Use NVME Offloading
              </Label>
              <p className="text-xs text-slate-500">Store model layers on NVME storage</p>
            </div>
            <Switch
              id="use-nvme"
              checked={useNvme}
              onCheckedChange={setUseNvme}
              disabled={isLoading || isUpdating || !status?.running}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantization" className="text-sm">
              Quantization
            </Label>
            <select
              id="quantization"
              value={quantization}
              onChange={(e) => setQuantization(e.target.value)}
              disabled={isLoading || isUpdating || !status?.running}
              className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
            >
              <option value="4bit">4-bit Quantization</option>
              <option value="5bit">5-bit Quantization</option>
              <option value="8bit">8-bit Quantization</option>
              <option value="none">No Quantization</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSaveUI} disabled={isLoading || isUpdating || !status?.running} className="gap-2">
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Configuration
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="json" className="space-y-6 pt-6">
        <div className="space-y-4">
          <Textarea
            value={jsonConfig}
            onChange={(e) => setJsonConfig(e.target.value)}
            disabled={isLoading || isUpdating || !status?.running}
            className="font-mono h-[400px] bg-slate-900"
          />

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={formatJson}
              disabled={isLoading || isUpdating || !status?.running}
              className="gap-2"
            >
              <RotateCw className="h-4 w-4" />
              Format JSON
            </Button>

            <Button onClick={handleSaveJSON} disabled={isLoading || isUpdating || !status?.running} className="gap-2">
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Configuration
            </Button>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
