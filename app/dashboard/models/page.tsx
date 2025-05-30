"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ProtectedRoute } from "@/components/protected-route"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context" // Fix import path here

interface ModelInfo {
  name: string
  size: string
  category: string
  status: "loaded" | "unloaded" | "loading" | "error"
  layers: {
    gpu: number
    cpu: number
    ram: number
    nvme: number
  }
}

interface HardwareInfo {
  gpu: {
    available: boolean
    count: number
    memory: Array<{
      device: number
      allocated_mb: number
      reserved_mb: number
    }>
  }
  cpu: {
    percent: number
    count: number
    threads: number
  }
  ram: {
    total_gb: number
    used_gb: number
    percent: number
  }
  nvme: {
    total_gb: number
    used_gb: number
    percent_used: number
  }
}

export default function ModelsPage() {
  const router = useRouter()
  const [models, setModels] = useState([])
  const [hardware, setHardware] = useState<HardwareInfo | null>(null)
  const [activeModel, setActiveModel] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [newModelName, setNewModelName] = useState("")
  const [newModelPath, setNewModelPath] = useState("")

  useEffect(() => {
    // Fetch models from API
    fetch("/api/models")
      .then((res) => res.json())
      .then((data) => {
        setModels(data.models || [])
        setLoading(false)
      })
      .catch((err) => {
        console.error("Error fetching models:", err)
        setLoading(false)
      })
    // In a real implementation, fetch from your API
    // For now, we'll use mock data
    const fetchData = async () => {
      try {
        // This would be replaced with actual API calls
        setHardware({
          gpu: {
            available: true,
            count: 1,
            memory: [{ device: 0, allocated_mb: 2048, reserved_mb: 8192 }],
          },
          cpu: {
            percent: 35,
            count: 8,
            threads: 16,
          },
          ram: {
            total_gb: 32,
            used_gb: 12.5,
            percent: 39,
          },
          nvme: {
            total_gb: 1000,
            used_gb: 350,
            percent_used: 35,
          },
        })

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching data:", error)
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleAddModel = async () => {
    if (!newModelName || !newModelPath) return

    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newModelName,
          path: newModelPath,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setModels([...models, { name: newModelName, path: newModelPath }])
        setNewModelName("")
        setNewModelPath("")
      }
    } catch (err) {
      console.error("Error adding model:", err)
    }
  }

  const loadModel = async (modelName: string) => {
    // This would call your API to load the model using the tensor server
    setModels(models.map((model) => (model.name === modelName ? { ...model, status: "loading" } : model)))

    // Simulate loading
    setTimeout(() => {
      setModels(
        models.map((model) =>
          model.name === modelName
            ? { ...model, status: "loaded" }
            : model.status === "loaded"
              ? { ...model, status: "unloaded" }
              : model,
        ),
      )
      setActiveModel(modelName)
    }, 2000)
  }

  const unloadModel = async (modelName: string) => {
    // This would call your API to unload the model
    setModels(models.map((model) => (model.name === modelName ? { ...model, status: "unloaded" } : model)))

    if (activeModel === modelName) {
      setActiveModel(null)
    }
  }

  const { isLoading: authLoading } = useAuth()

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Model Management</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Add New Model</CardTitle>
              <CardDescription>Register a new model for use with the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="model-name">Model Name</Label>
                  <Input
                    id="model-name"
                    placeholder="e.g., Qwen2.5-Coder-14B"
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model-path">Model Path</Label>
                  <Input
                    id="model-path"
                    placeholder="e.g., C:\Models\Qwen2.5-Coder-14B-Instruct-GGUF"
                    value={newModelPath}
                    onChange={(e) => setNewModelPath(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleAddModel}>Add Model</Button>
            </CardFooter>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? (
            <p>Loading models...</p>
          ) : models.length > 0 ? (
            models.map((model, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>{model.name}</CardTitle>
                  <CardDescription className="truncate">{model.path}</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <p>No models registered yet.</p>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
