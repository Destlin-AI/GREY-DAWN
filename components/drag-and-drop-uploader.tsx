"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

interface DroppedFile {
  name: string
  type: string
  content: string
  id?: string
  uploadedAt?: string
  fixed?: boolean
  originalContent?: string
}

// Supported file types
const SUPPORTED_FILE_TYPES = [
  ".ts",
  ".js",
  ".py",
  ".json",
  ".yaml",
  ".yml",
  ".txt",
  ".md",
  ".jsx",
  ".tsx",
  ".css",
  ".scss",
  ".html",
  ".xml",
  ".csv",
]

// Script Fixer integration for the UI
class ScriptFixerIntegration {
  cache: Map<string, string>

  constructor() {
    this.cache = new Map()
  }

  async fixScript(content: string, fileType: string): Promise<string> {
    // Hash the content for caching
    const contentHash = await this.hashString(content)
    const cacheKey = `${contentHash}_${fileType}`

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) || content
    }

    // Apply fixes based on file type
    let fixed = content

    if (fileType === ".py") {
      fixed = this.normalizePathsInPython(content)
      fixed = this.addPortableHeader(fixed)
      fixed = this.fixDependencies(fixed)
    } else if ([".js", ".ts", ".jsx", ".tsx"].includes(fileType)) {
      fixed = this.normalizePathsInJS(content)
    }

    // Cache the result
    this.cache.set(cacheKey, fixed)
    return fixed
  }

  normalizePathsInPython(content: string): string {
    // Simple regex-based path normalization for Python
    return content.replace(
      /(["'])(\/[^"'\n]+|[A-Z]:\\[^"'\n]+)(["'])/g,
      "Path(__file__).parent / $1${pathlib.basename('$2')}$3",
    )
  }

  normalizePathsInJS(content: string): string {
    // Path normalization for JS files
    return content.replace(
      /(["'])(\/[^"'\n]+|[A-Z]:\\[^"'\n]+)(["'])/g,
      "path.join(__dirname, $1${path.basename('$2')}$3)",
    )
  }

  addPortableHeader(content: string): string {
    const header = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path
import sys

__file__ = Path(__file__).resolve()
`
    return header + content
  }

  /**
   * Adds auto-dependency resolution to Python code.
   *
   * This method analyzes Python code to find import statements, then adds
   * a header that automatically installs missing dependencies using pip.
   * It ignores standard libraries like sys, os, pathlib, and Path.
   *
   * @param content - The Python code content to process
   * @returns The modified Python code with auto-dependency resolution
   */
  fixDependencies(content: string): string {
    // Add auto-import capability
    const autoImportHeader = `
# Auto-dependency resolver
try:
    import importlib.util
    import subprocess
    import sys
    
    def ensure_import(package):
        try:
            return __import__(package)
        except ImportError:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', package])
            return __import__(package)
            
`

    // Simple regex to find imports
    const importMatches = content.match(/import\s+([a-zA-Z0-9_]+)/g) || []
    const fromImportMatches = content.match(/from\s+([a-zA-Z0-9_]+)\s+import/g) || []

    const allPackages: string[] = []

    importMatches.forEach((match: string) => {
      const pkg = match.replace("import", "").trim()
      if (!["sys", "os", "pathlib", "Path"].includes(pkg)) {
        allPackages.push(pkg)
      }
    })

    fromImportMatches.forEach((match: string) => {
      const pkg = match.replace("from", "").replace("import", "").trim()
      if (!["sys", "os", "pathlib", "Path"].includes(pkg)) {
        allPackages.push(pkg)
      }
    })

    if (allPackages.length > 0) {
      let autoImports = autoImportHeader
      allPackages.forEach((pkg) => {
        autoImports += `${pkg} = ensure_import('${pkg}')\n`
      })
      autoImports += "\n# End auto-dependency resolver\n\n"

      return autoImports + content
    }

    return content
  }

  async hashString(str: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(str)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  }
}

// File type categories for filtering
const FILE_TYPE_CATEGORIES = [
  { label: "JavaScript/TypeScript", extensions: [".js", ".jsx", ".ts", ".tsx"] },
  { label: "Python", extensions: [".py"] },
  { label: "Markup", extensions: [".html", ".xml", ".md"] },
  { label: "Styles", extensions: [".css", ".scss"] },
  { label: "Data", extensions: [".json", ".yaml", ".yml", ".csv"] },
  { label: "Text", extensions: [".txt"] },
]

export function DragAndDropUploader() {
  const { toast } = useToast()
  const [droppedFiles, setDroppedFiles] = useState<DroppedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [editFile, setEditFile] = useState<DroppedFile | null>(null)
  const [newFileName, setNewFileName] = useState("")
  const [newFileContent, setNewFileContent] = useState("")
  const dropZoneRef = useRef(null)

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState<"name" | "date" | "type">("date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [fileToShare, setFileToShare] = useState<string>("")

  // Fetch existing files on component mount
  useEffect(() => {
    fetchUploadedFiles()
  }, [])

  const fetchUploadedFiles = async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch("/api/files")
      if (res.ok) {
        const files = await res.json()
        setDroppedFiles(files)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch uploaded files",
        })
      }
    } catch (error) {
      console.error("Error fetching files:", error)
      toast({
        title: "Error",
        description: "Failed to fetch uploaded files",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    setIsLoading(true)

    const files = Array.from(e.dataTransfer.files)
    const uploads: DroppedFile[] = []
    let hasInvalidFile = false

    for (const file of files) {
      // Check if file type is supported
      const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`
      if (!SUPPORTED_FILE_TYPES.includes(fileExtension)) {
        toast({
          title: "Unsupported File Type",
          description: `${file.name} is not a supported file type`,
        })
        hasInvalidFile = true
        continue
      }

      try {
        const text = await file.text()
        uploads.push({ name: file.name, type: file.type, content: text })

        await uploadFile(file.name, text)
      } catch (error) {
        console.error("Error reading/uploading file:", error)
        toast({
          title: "Upload Error",
          description: `Failed for ${file.name}`,
        })
      }
    }

    if (uploads.length > 0) {
      setDroppedFiles((prev) => [...prev, ...uploads])
      toast({
        title: "Files Uploaded",
        description: `Successfully uploaded ${uploads.length} file(s)`,
      })
    } else if (!hasInvalidFile) {
      toast({
        title: "Upload Failed",
        description: "No files were uploaded",
      })
    }

    setIsLoading(false)
  }

  const uploadFile = async (filename: string, content: string) => {
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, content }),
      })
      if (!res.ok) {
        throw new Error("Failed upload")
      }
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragging) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDeleteFile = async (filename: string) => {
    try {
      const res = await fetch(`/api/files/${encodeURIComponent(filename)}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setDroppedFiles((prev) => prev.filter((file) => file.name !== filename))
        toast({
          title: "File Deleted",
          description: `${filename} has been deleted`,
        })
      } else {
        toast({
          title: "Delete Failed",
          description: "Failed to delete the file",
        })
      }
    } catch (error) {
      console.error("Error deleting file:", error)
      toast({
        title: "Error",
        description: "An error occurred while deleting the file",
      })
    }
  }

  const handleDownloadFile = (file: DroppedFile) => {
    const blob = new Blob([file.content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleEditFile = (file: DroppedFile) => {
    setEditFile(file)
    setNewFileName(file.name)
    setNewFileContent(file.content)
  }

  const handleSaveEdit = async () => {
    if (!editFile) {
      return
    }

    try {
      // Delete the old file
      await fetch(`/api/files/${encodeURIComponent(editFile.name)}`, {
        method: "DELETE",
      })

      // Upload the new file
      await uploadFile(newFileName, newFileContent)

      // Update the UI
      setDroppedFiles((prev) =>
        prev.map((file) =>
          file.name === editFile.name ? { ...file, name: newFileName, content: newFileContent } : file,
        ),
      )

      toast({
        title: "File Updated",
        description: `${editFile.name} has been updated`,
      })

      // Close the dialog
      setEditFile(null)
    } catch (error) {
      console.error("Error updating file:", error)
      toast({
        title: "Update Failed",
        description: "Failed to update the file",
      })
    }
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()

    switch (extension) {
      case "js":
      case "jsx":
      case "ts":
      case "tsx":
        return <Badge className="bg-yellow-600 text-white"> JS / TS </Badge>
      case "py":
        return <Badge className="bg-blue-600 text-white"> Python </Badge>
      case "json":
        return <Badge className="bg-orange-600 text-white"> JSON </Badge>
      case "yaml":
      case "yml":
        return <Badge className="bg-green-600 text-white"> YAML </Badge>
      case "md":
        return <Badge className="bg-purple-600 text-white"> MD </Badge>
      case "html":
        return <Badge className="bg-red-600 text-white"> HTML </Badge>
      case "css":
      case "scss":
        return <Badge className="bg-blue-400 text-white"> CSS </Badge>
      default:
        return <Badge className="bg-slate-600 text-white"> TXT </Badge>
    }
  }

  const getFileExtension = (fileName: string): string => {
    return `.${fileName.split(".").pop()?.toLowerCase() || ""}`
  }

  const toggleFileTypeFilter = (category: string) => {
    const categoryExtensions = FILE_TYPE_CATEGORIES.find((c) => c.label === category)?.extensions || []

    // Check if all extensions in this category are already selected
    const allSelected = categoryExtensions.every((ext) => selectedFileTypes.includes(ext))

    if (allSelected) {
      // Remove all extensions in this category
      setSelectedFileTypes((prev) => prev.filter((ext) => !categoryExtensions.includes(ext)))
    } else {
      // Add all extensions in this category that aren't already selected
      setSelectedFileTypes((prev) => [...prev, ...categoryExtensions.filter((ext) => !prev.includes(ext))])
    }
  }

  const isCategorySelected = (category: string): boolean => {
    const categoryExtensions = FILE_TYPE_CATEGORIES.find((c) => c.label === category)?.extensions || []
    return categoryExtensions.some((ext) => selectedFileTypes.includes(ext))
  }

  // Add the filtered and sorted files
  const filteredFiles = droppedFiles.filter((file) => {
    // Apply search filter
    if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }

    // Apply file type filter
    if (selectedFileTypes.length > 0) {
      const fileExtension = getFileExtension(file.name)
      return selectedFileTypes.includes(fileExtension)
    }

    return true
  })

  // Sort files
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    if (sortOrder === "name") {
      return sortDirection === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    } else if (sortOrder === "type") {
      const extA = getFileExtension(a.name)
      const extB = getFileExtension(b.name)
      return sortDirection === "asc" ? extA.localeCompare(extB) : extB.localeCompare(extA)
    } else {
      // Sort by date
      const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0
      const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0
      return sortDirection === "asc" ? dateA - dateB : dateB - dateA
    }
  })

  // Analyze file with LLM
  const analyzeWithLLM = async (file: DroppedFile) => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/analyze-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          content: file.content,
        }),
      })

      if (!res.ok) {
        throw new Error("Analysis failed")
      }

      const data = await res.json()

      toast({
        title: "Analysis Complete",
        description: `The LLM has analyzed ${file.name}`,
      })

      // Open the analysis in a dialog or new view
      // You could implement this part based on your UI design
    } catch (error) {
      console.error("Error analyzing file:", error)
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze the file with LLM",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Share file
  const handleShareFile = (filename: string) => {
    setFileToShare(filename)
    setShareDialogOpen(true)
  }

  // Fix script
  const handleFixScript = async (file: DroppedFile) => {
    if (!file.content) return

    const fileExtension = getFileExtension(file.name)
    const scriptFixer = new ScriptFixerIntegration()

    try {
      const fixedContent = await scriptFixer.fixScript(file.content, fileExtension)

      // Update the file with fixed content
      setDroppedFiles((prev) =>
        prev.map((f) =>
          f.name === file.name ? { ...f, content: fixedContent, fixed: true, originalContent: f.content } : f,
        ),
      )

      // Upload the fixed version
      await uploadFile(file.name, fixedContent)

      toast({
        title: "Script Fixed",
        description: `${file.name} has been optimized for portability`,
      })
    } catch (error) {
      console.error("Error fixing script:", error)
      toast({
        title: "Fix Failed",
        description: "Failed to optimize the script",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search files..."
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            onClick={fetchUploadedFiles}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILE_TYPE_CATEGORIES.map((category) => (
            <button
              key={category.label}
              onClick={() => toggleFileTypeFilter(category.label)}
              className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 ${
                isCategorySelected(category.label) ? "bg-accent text-accent-foreground" : "bg-background"
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "name" | "date" | "type")}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="date">Date</option>
            <option value="name">Name</option>
            <option value="type">Type</option>
          </select>
          <button
            onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            {sortDirection === "asc" ? "↑ Ascending" : "↓ Descending"}
          </button>
        </div>
      </div>

      <div
        ref={dropZoneRef}
        className={`border-2 border-dashed rounded-lg p-8 text-center ${
          isDragging ? "border-primary bg-primary/10" : "border-muted-foreground/25"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="mt-2 text-sm text-muted-foreground">Uploading files...</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="mt-2 text-sm text-muted-foreground">Drag and drop files here, or click to select files</p>
              <p className="text-xs text-muted-foreground mt-1">
                Supported file types: {SUPPORTED_FILE_TYPES.join(", ")}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-medium">Uploaded Files ({sortedFiles.length})</h3>
        <div className="mt-2 space-y-2">
          {sortedFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
          ) : (
            sortedFiles.map((file) => (
              <div key={file.name} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center space-x-3">
                  {getFileIcon(file.name)}
                  <span className="font-medium">{file.name}</span>
                  {file.fixed && (
                    <Badge variant="outline" className="bg-green-100">
                      Fixed
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDownloadFile(file)}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0"
                  >
                    <span className="sr-only">Download</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleEditFile(file)}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0"
                  >
                    <span className="sr-only">Edit</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleShareFile(file.name)}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0"
                  >
                    <span className="sr-only">Share</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => analyzeWithLLM(file)}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0"
                  >
                    <span className="sr-only">Analyze</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </button>
                  {[".py", ".js", ".ts", ".jsx", ".tsx"].includes(getFileExtension(file.name)) && (
                    <button
                      onClick={() => handleFixScript(file)}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0"
                    >
                      <span className="sr-only">Fix Script</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                        />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteFile(file.name)}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0 hover:bg-red-100"
                  >
                    <span className="sr-only">Delete</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// Add default export
export default DragAndDropUploader
