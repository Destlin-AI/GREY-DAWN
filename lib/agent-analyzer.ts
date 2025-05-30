/**
 * Agent Analyzer - Automatically detects and registers agent capabilities from scripts
 */
export interface AgentMetadata {
  id: string
  name: string
  description: string
  capabilities: string[]
  inputs: { name: string; type: string; description: string; required: boolean }[]
  outputs: { name: string; type: string; description: string }[]
  version: string
  author?: string
  dependencies?: string[]
  tags?: string[]
  category?: string
}

export class AgentAnalyzer {
  // Patterns to identify agent metadata in various script types
  private static PYTHON_METADATA_PATTERN = /"""NEXUS_AGENT\n([\s\S]*?)"""/
  private static JS_METADATA_PATTERN = /\/\*\*\s*NEXUS_AGENT\s*([\s\S]*?)\*\*\//

  /**
   * Analyzes a script to extract agent metadata
   */
  public static analyzeScript(content: string, filename: string): AgentMetadata | null {
    try {
      // Determine script type from extension
      const extension = filename.split(".").pop()?.toLowerCase()

      // Extract metadata based on script type
      let metadataStr: string | null = null
      if (extension === "py") {
        const match = content.match(this.PYTHON_METADATA_PATTERN)
        if (match && match[1]) metadataStr = match[1]
      } else if (["js", "ts", "jsx", "tsx"].includes(extension || "")) {
        const match = content.match(this.JS_METADATA_PATTERN)
        if (match && match[1]) metadataStr = match[1]
      }

      // If no metadata block found, try to infer capabilities from script
      if (!metadataStr) {
        return this.inferAgentCapabilities(content, filename)
      }

      // Parse metadata block to JSON
      return this.parseMetadata(metadataStr, filename)
    } catch (error) {
      console.error(`Error analyzing script ${filename}:`, error)
      return null
    }
  }

  /**
   * Attempts to infer agent capabilities from script content
   */
  private static inferAgentCapabilities(content: string, filename: string): AgentMetadata | null {
    // Extract name from filename
    const name = filename
      .split(".")[0]
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")

    // Detect common patterns to infer capabilities
    const capabilities: string[] = []

    if (content.includes("import requests") || content.includes("fetch(") || content.includes("axios")) {
      capabilities.push("network")
    }

    if (content.includes("import os") || content.includes("fs.") || content.includes("path.")) {
      capabilities.push("file-system")
    }

    if (
      content.includes("import torch") ||
      content.includes("import tensorflow") ||
      content.includes("from transformers import")
    ) {
      capabilities.push("machine-learning")
    }

    if (
      content.includes("import numpy") ||
      content.includes("import pandas") ||
      content.includes("matplotlib") ||
      content.includes("plotly")
    ) {
      capabilities.push("data-analysis")
    }

    if (
      content.includes("selenium") ||
      content.includes("playwright") ||
      content.includes("beautifulsoup") ||
      content.includes("cheerio")
    ) {
      capabilities.push("web-scraping")
    }

    if (capabilities.length === 0) {
      capabilities.push("utility")
    }

    return {
      id: `inferred-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name,
      description: `Auto-detected agent from ${filename}`,
      capabilities,
      inputs: [{ name: "input", type: "string", description: "Input data", required: true }],
      outputs: [{ name: "output", type: "string", description: "Output data" }],
      version: "1.0.0",
      tags: ["auto-detected"],
      category: "inferred",
    }
  }

  /**
   * Parses metadata string to structured metadata
   */
  private static parseMetadata(metadataStr: string, filename: string): AgentMetadata {
    try {
      // Try parsing as JSON first
      try {
        return JSON.parse(metadataStr)
      } catch {
        // If not valid JSON, parse as YAML-like format
        const lines = metadataStr.split("\n")
        const metadata: Record<string, any> = {}

        let currentKey: string | null = null
        let currentValue: string[] = []

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine) continue

          // Check if line is a new key
          const keyMatch = trimmedLine.match(/^(\w+):\s*(.*)$/)
          if (keyMatch) {
            // Save previous key-value pair
            if (currentKey) {
              metadata[currentKey] = currentValue.length === 1 ? currentValue[0] : currentValue.join("\n")
            }

            // Start new key-value pair
            currentKey = keyMatch[1].toLowerCase()
            currentValue = keyMatch[2] ? [keyMatch[2]] : []
          } else if (currentKey) {
            // Continue previous value
            currentValue.push(trimmedLine)
          }
        }

        // Save last key-value pair
        if (currentKey) {
          metadata[currentKey] = currentValue.length === 1 ? currentValue[0] : currentValue.join("\n")
        }

        // Parse capabilities, inputs, outputs
        if (typeof metadata.capabilities === "string") {
          metadata.capabilities = metadata.capabilities.split(",").map((cap: string) => cap.trim())
        }

        if (!metadata.id) {
          metadata.id = `agent-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        }

        return metadata as AgentMetadata
      }
    } catch (error) {
      console.error(`Error parsing metadata for ${filename}:`, error)

      // Return minimal metadata
      return {
        id: `fallback-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: filename.split(".")[0],
        description: `Agent from ${filename}`,
        capabilities: ["unknown"],
        inputs: [{ name: "input", type: "string", description: "Input data", required: true }],
        outputs: [{ name: "output", type: "string", description: "Output data" }],
        version: "1.0.0",
      }
    }
  }
}
