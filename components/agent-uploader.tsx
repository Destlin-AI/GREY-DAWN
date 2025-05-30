"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Upload, FileText, Code, Brain, Zap } from "lucide-react"

interface AgentFile {
  name: string
  content: string
  type: string
  size: number
}

export default function AgentUploader() {
  const { toast } = useToast()
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState<AgentFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [agentName, setAgentName] = useState("")
  const [agentDescription, setAgentDescription] = useState("")
  const [agentCategory, setAgentCategory] = useState("general")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const categories = [
    { id: "general", name: "General", icon: Brain },
    { id: "memory", name: "Memory", icon: Brain },
    { id: "logic", name: "Logic", icon: Code },
    { id: "swarm", name: "Swarm", icon: Zap },
    { id: "neural", name: "Neural", icon: Brain },
    { id: "quantum", name: "Quantum", icon: Zap },
    { id: "gpu", name: "GPU", icon: Zap },
    { id: "code", name: "Code", icon: Code },
  ]

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    await processFiles(droppedFiles)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      await processFiles(selectedFiles)
    }
  }

  const processFiles = async (fileList: File[]) => {
    const newFiles: AgentFile[] = []

    for (const file of fileList) {
      if (
        file.type.includes("text") ||
        file.name.endsWith(".py") ||
        file.name.endsWith(".js") ||
        file.name.endsWith(".ts")
      ) {
        try {
          const content = await file.text()
          newFiles.push({
            name: file.name,
            content,
            type: file.type || "text/plain",
            size: file.size,
          })
        } catch (error) {
          console.error("Error reading file:", error)
          toast({
            title: "Error",
            description: `Failed to read ${file.name}`,
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Unsupported File",
          description: `${file.name} is not a supported file type`,
          variant: "destructive",
        })
      }
    }

    setFiles((prev) => [...prev, ...newFiles])
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadAgent = async () => {
    if (!agentName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide an agent name",
        variant: "destructive",
      })
      return
    }

    if (files.length === 0) {
      toast({
        title: "No Files",
        description: "Please upload at least one file",
        variant: "destructive",
      })
      return
    }

    setUploading(true)

    try {
      const agentData = {
        name: agentName,
        description: agentDescription,
        category: agentCategory,
        files: files,
        uploadedAt: new Date().toISOString(),
      }

      const response = await fetch("/api/agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(agentData),
      })

      if (response.ok) {
        toast({
          title: "Agent Uploaded",
          description: `${agentName} has been successfully uploaded`,
        })

        // Reset form
        setAgentName("")
        setAgentDescription("")
        setAgentCategory("general")
        setFiles([])
      } else {
        throw new Error("Upload failed")
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Upload Failed",
        description: "Failed to upload agent",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Agent Uploader
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Agent Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="agentName">Agent Name</Label>
            <Input
              id="agentName"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="Enter agent name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agentCategory">Category</Label>
            <select
              id="agentCategory"
              value={agentCategory}
              onChange={(e) => setAgentCategory(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm border border-input bg-background rounded-md"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="agentDescription">Description</Label>
          <Textarea
            id="agentDescription"
            value={agentDescription}
            onChange={(e) => setAgentDescription(e.target.value)}
            placeholder="Describe what this agent does"
            rows={3}
          />
        </div>

        {/* File Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">Drop agent files here</p>
          <p className="text-sm text-muted-foreground mb-4">Supports .py, .js, .ts, and text files</p>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            Browse Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".py,.js,.ts,.txt,.md"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Uploaded Files */}
        {files.length > 0 && (
          <div className="space-y-2">
            <Label>Uploaded Files ({files.length})</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => removeFile(index)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={uploadAgent}
          disabled={uploading || !agentName.trim() || files.length === 0}
          className="w-full"
        >
          {uploading ? "Uploading..." : "Upload Agent"}
        </Button>
      </CardContent>
    </Card>
  )
}

export { AgentUploader }
