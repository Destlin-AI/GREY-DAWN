"use client"

import { useState } from "react"
import { toast } from "react-hot-toast"

const FILE_TYPE_CATEGORIES = [
  { label: "Python", extensions: [".py"] },
  { label: "JavaScript", extensions: [".js", ".jsx"] },
  { label: "TypeScript", extensions: [".ts", ".tsx"] },
  { label: "Text", extensions: [".txt"] },
  { label: "Markdown", extensions: [".md"] },
  { label: "JSON", extensions: [".json"] },
  { label: "YAML", extensions: [".yaml", ".yml"] },
  { label: "CSV", extensions: [".csv"] },
  { label: "HTML", extensions: [".html", ".htm"] },
  { label: "CSS", extensions: [".css"] },
  { label: "C++", extensions: [".cpp", ".cxx", ".hpp", ".h"] },
  { label: "Java", extensions: [".java"] },
  { label: "Go", extensions: [".go"] },
  { label: "C#", extensions: [".cs"] },
  { label: "PHP", extensions: [".php"] },
  { label: "Ruby", extensions: [".rb"] },
  { label: "Swift", extensions: [".swift"] },
  { label: "Kotlin", extensions: [".kt", ".kts"] },
  { label: "Shell", extensions: [".sh", ".bash", ".zsh"] },
  { label: "Docker", extensions: ["Dockerfile"] },
]

interface DroppedFile {
  name: string
  content: string
}

const DragAndDropUploader = () => {
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

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

  // The rest of your component code...

  return (
    // Your JSX here
    <div>Drag and Drop Uploader</div>
  )
}

// ScriptFixerIntegration implementation that handles code fixing
class ScriptFixerIntegration {
  cache: Map<string, string>

  constructor() {
    this.cache = new Map()
  }

  async fixScript(content: string, fileType: string) {
    // Hash the content for caching
    const contentHash = await this.hashString(content)
    const cacheKey = `${contentHash}_${fileType}`

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
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

  normalizePathsInPython(content: string) {
    // Simple regex-based path normalization for Python
    return content.replace(
      /(["'])(\/[^"'\n]+|[A-Z]:\\[^"'\n]+)(["'])/g,
      "Path(__file__).parent / $1${pathlib.basename('$2')}$3",
    )
  }

  normalizePathsInJS(content: string) {
    // Path normalization for JS files
    return content.replace(
      /(["'])(\/[^"'\n]+|[A-Z]:\\[^"'\n]+)(["'])/g,
      "path.join(__dirname, $1${path.basename('$2')}$3)",
    )
  }

  addPortableHeader(content: string) {
    const header = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path
import sys

__file__ = Path(__file__).resolve()
`
    return header + content
  }

  fixDependencies(content: string) {
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

  async hashString(str: string) {
    const encoder = new TextEncoder()
    const data = encoder.encode(str)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  }
}

// Add this function to the DragAndDropUploader component
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
