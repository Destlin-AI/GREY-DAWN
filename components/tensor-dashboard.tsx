"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ErrorBoundary } from "react-error-boundary"
import { useTensorEngine } from "@/hooks/use-tensor-engine"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { HardwareMonitor } from "@/components/hardware-monitor"
import { ModelSelector } from "@/components/model-selector"
import { ServerControls } from "@/components/server-controls"
import { LogViewer } from "@/components/log-viewer"
import { ConfigEditor } from "@/components/config-editor"
import { LayerTransferMap } from "@/components/tensor-visualization/layer-transfer-map"
import { BrainControlPanel } from "@/components/brain-control-panel"
import { BrainControlPanelAdvanced } from "@/components/brain-control-panel-advanced"
import { EnhancedBrainControlPanel } from "@/components/enhanced-brain-control-panel"
import { IntegratedLLMTensorManager } from "@/components/integrated-llm-tensor-manager"
import { DragAndDropUploader } from "@/components/drag-and-drop-uploader"
import { AgentUploader } from "@/components/agent-uploader"
import { AgentSwarmDashboard } from "@/components/agent-swarm-dashboard"
import { FileAnalysisPanel } from "@/components/file-analysis-panel"
import { CodeGenerator } from "@/components/code/code-generator"
import { SelfRepairingUpload } from "@/components/upload/self-repairing-upload"
import { QwenTensorManager } from "@/components/qwen-tensor-manager"
import { WebGPUTensorManager } from "@/components/webgpu-tensor-manager"
import { WebGPUTensorTest } from "@/components/webgpu-tensor-test"
import { TensorEngineStatus } from "@/components/tensor-engine-status"
import { StatusDisplay } from "@/components/status-display"
import { StatusBar } from "@/components/status-bar"
import { NotificationPanel } from "@/components/notification-panel"
import { WeatherWidget } from "@/components/weather-widget"
import { DataExport } from "@/components/data-export"

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="flex items-center justify-center h-screen">
      <Alert className="max-w-md">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-semibold">Something went wrong</p>
            <p className="text-sm">{error.message}</p>
            <Button onClick={resetErrorBoundary} size="sm">
              Try again
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}

// Wrap the main dashboard component
export function TensorDashboard() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <TensorDashboardContent />
    </ErrorBoundary>
  )
}

function TensorDashboardContent() {
  const {
    status,
    logs,
    isLoading,
    error,
    startEngine,
    stopEngine,
    detectHardware,
    setNvmePath,
    simulateInference,
    clearError,
  } = useTensorEngine({ autoDetectOnMount: true })

  const [activeTab, setActiveTab] = useState("overview")
  const [isClient, setIsClient] = useState(false)

  // Client-side only switch to prevent SSR issues
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Show loading during SSR
  if (!isClient) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-white mb-2">Initializing Tensor Engine</h2>
            <p className="text-slate-400">Loading enterprise control interface...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Status Bar */}
      <StatusBar />

      {/* Header */}
      <header className="mb-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Project Destlin AI</h1>
            <p className="text-slate-400">Tensor Engine Control Interface - Enterprise Edition</p>
          </div>
          <div className="flex items-center gap-2">
            <TensorEngineStatus />
            {status?.isRunning ? (
              <Badge className="bg-green-600">Engine Online</Badge>
            ) : (
              <Badge variant="destructive">Engine Offline</Badge>
            )}
            {status?.model?.name && (
              <Badge variant="outline" className="border-blue-800 bg-blue-950 text-blue-400">
                {status.model.name}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Notification Panel */}
      <NotificationPanel />

      {/* Weather Widget */}
      <div className="mb-6">
        <WeatherWidget />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1">
          <Card className="border-slate-800 bg-black/50 shadow-lg backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-semibold text-white">Control Center</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="flex flex-col">
                {[
                  "overview",
                  "models",
                  "hardware",
                  "llm-bay",
                  "brain-control",
                  "layers",
                  "uploads",
                  "code-repair",
                  "agents",
                  "qwen-tensor",
                  "webgpu-tensor",
                  "config",
                  "logs",
                  "advanced",
                ].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-3 border-l-2 px-4 py-3 text-left transition-colors ${
                      activeTab === tab
                        ? "border-l-blue-500 bg-blue-500/10 text-blue-400"
                        : "border-l-transparent text-slate-400 hover:border-l-slate-500 hover:bg-slate-800/50 hover:text-slate-300"
                    }`}
                  >
                    <span className="capitalize">{tab.replace("-", " ")}</span>
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>

          {/* Server Control Panel */}
          <Card className="mt-6 border-slate-800 bg-black/50 shadow-lg backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-semibold text-white">Server Control</CardTitle>
            </CardHeader>
            <CardContent>
              <ServerControls status={status} isLoading={isLoading} onStart={startEngine} onStop={stopEngine} />
            </CardContent>
          </Card>

          {/* Status Display */}
          <Card className="mt-6 border-slate-800 bg-black/50 shadow-lg backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-semibold text-white">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusDisplay status={status} />
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <Card className="border-slate-800 bg-black/50 shadow-lg backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white">System Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-lg bg-slate-900/50 p-4">
                      <div className="text-sm font-medium text-slate-400">Engine Status</div>
                      <div className="mt-1 text-2xl font-bold">{status?.isRunning ? "Online" : "Offline"}</div>
                    </div>

                    <div className="rounded-lg bg-slate-900/50 p-4">
                      <div className="text-sm font-medium text-slate-400">Active Model</div>
                      <div className="mt-1 text-2xl font-bold truncate">{status?.model?.name || "None"}</div>
                    </div>

                    <div className="rounded-lg bg-slate-900/50 p-4">
                      <div className="text-sm font-medium text-slate-400">GPU Layers</div>
                      <div className="mt-1 text-2xl font-bold">{status?.allocation?.gpu || 0}</div>
                    </div>
                  </div>

                  <DataExport />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Models Tab */}
          {activeTab === "models" && (
            <Card className="border-slate-800 bg-black/50 shadow-lg backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white">Model Management</CardTitle>
              </CardHeader>
              <CardContent>
                <ModelSelector status={status} isLoading={isLoading} onLoadModel={startEngine} />
              </CardContent>
            </Card>
          )}

          {/* Hardware Tab */}
          {activeTab === "hardware" && (
            <Card className="border-slate-800 bg-black/50 shadow-lg backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white">Hardware Monitor</CardTitle>
              </CardHeader>
              <CardContent>
                <HardwareMonitor status={status} />
              </CardContent>
            </Card>
          )}

          {/* LLM Bay Tab */}
          {activeTab === "llm-bay" && (
            <Card className="border-slate-800 bg-black/50 shadow-lg backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white">LLM Bay</CardTitle>
              </CardHeader>
              <CardContent>
                <IntegratedLLMTensorManager />
              </CardContent>
            </Card>
          )}

          {/* Brain Control Tab */}
          {activeTab === "brain-control" && (
            <Card className="border-slate-800 bg-black/50 shadow-lg backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white">Brain Control</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="basic">
                  <TabsList>
                    <TabsTrigger value="basic">Basic</TabsTrigger>
                    <TabsTrigger value="enhanced">Enhanced</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  </TabsList>
                  <TabsContent value="basic">
                    <BrainControlPanel />
                  </TabsContent>
                  <TabsContent value="enhanced">
                    <EnhancedBrainControlPanel />
                  </TabsContent>
                  <TabsContent value="advanced">
                    <BrainControlPanelAdvanced />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Layers Tab */}
          {activeTab === "layers" && (
            <Card className="border-slate-800 bg-black/50 shadow-lg backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white">Layer Management</CardTitle>
              </CardHeader>
              <CardContent>
                <LayerTransferMap />
              </CardContent>
            </Card>
          )}

          {/* Uploads Tab */}
          {activeTab === "uploads" && (
            <Card className="border-slate-800 bg-black/50 shadow-lg backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white">File Upload Center</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="standard">
                  <TabsList>
                    <TabsTrigger value="standard">Standard Upload</TabsTrigger>
                    <TabsTrigger value="self-repair">Self-Repairing</TabsTrigger>
                    <TabsTrigger value="analysis">File Analysis</TabsTrigger>
                  </TabsList>
                  <TabsContent value="standard">
                    <DragAndDropUploader />
                  </TabsContent>
                  <TabsContent value="self-repair">
                    <SelfRepairingUpload />
                  </TabsContent>
                  <TabsContent value="analysis">
                    <FileAnalysisPanel />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Code Repair Tab */}
          {activeTab === "code-repair" && (
            <Card className="border-slate-800 bg-black/50 shadow-lg backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white">Code Generator & Repair</CardTitle>
              </CardHeader>
              <CardContent>
                <CodeGenerator />
              </CardContent>
            </Card>
          )}

          {/* Agents Tab */}
          {activeTab === "agents" && (
            <Card className="border-slate-800 bg-black/50 shadow-lg backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white">Agent Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="upload">
                  <TabsList>
                    <TabsTrigger value="upload">Agent Upload</TabsTrigger>
                    <TabsTrigger value="swarm">Agent Swarm</TabsTrigger>
                  </TabsList>
                  <TabsContent value="upload">
                    <AgentUploader />
                  </TabsContent>
                  <TabsContent value="swarm">
                    <AgentSwarmDashboard />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Qwen Tensor Tab */}
          {activeTab === "qwen-tensor" && (
            <Card className="border-slate-800 bg-black/50 shadow-lg backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white">Qwen Tensor Engine</CardTitle>
              </CardHeader>
              <CardContent>
                <QwenTensorManager />
              </CardContent>
            </Card>
          )}

          {/* WebGPU Tensor Tab */}
          {activeTab === "webgpu-tensor" && (
            <Card className="border-slate-800 bg-black/50 shadow-lg backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white">WebGPU Tensor Engine</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="manager">
                  <TabsList>
                    <TabsTrigger value="manager">Manager</TabsTrigger>
                    <TabsTrigger value="test">Test Suite</TabsTrigger>
                  </TabsList>
                  <TabsContent value="manager">
                    <WebGPUTensorManager />
                  </TabsContent>
                  <TabsContent value="test">
                    <WebGPUTensorTest />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Config Tab */}
          {activeTab === "config" && (
            <Card className="border-slate-800 bg-black/50 shadow-lg backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white">Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <ConfigEditor status={status} isLoading={isLoading} onUpdateConfig={() => {}} />
              </CardContent>
            </Card>
          )}

          {/* Logs Tab */}
          {activeTab === "logs" && (
            <Card className="border-slate-800 bg-black/50 shadow-lg backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white">System Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <LogViewer logs={logs} />
              </CardContent>
            </Card>
          )}

          {/* Advanced Tab */}
          {activeTab === "advanced" && (
            <Card className="border-slate-800 bg-black/50 shadow-lg backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white">Advanced Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <Button onClick={detectHardware} disabled={isLoading}>
                    Detect Hardware
                  </Button>
                  <Button onClick={() => setNvmePath("/path/to/nvme")} disabled={isLoading}>
                    Set NVME Path
                  </Button>
                  <Button onClick={() => simulateInference("Test prompt", { maxTokens: 100 })} disabled={isLoading}>
                    Test Inference
                  </Button>
                  {error && (
                    <Button onClick={clearError} variant="outline">
                      Clear Error
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
