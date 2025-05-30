import { promises as fs } from "fs"
import path from "path"
import { execSync } from "child_process"

export interface AgentDefinition {
  id: string
  name: string
  file: string
  category: string
  description: string
  dependencies: string[]
  features: string[]
  status: "active" | "inactive" | "error"
  lastRun?: Date
  metadata?: Record<string, any>
}

export interface AgentExecutionResult {
  success: boolean
  output: any
  error?: string
  executionTime: number
  metadata?: any
}

export class AgentRegistry {
  private static instance: AgentRegistry
  private agents: Map<string, AgentDefinition> = new Map()
  private agentRoot: string

  private constructor(agentRoot: string) {
    this.agentRoot = agentRoot
  }

  public static getInstance(agentRoot?: string): AgentRegistry {
    if (!AgentRegistry.instance) {
      if (!agentRoot) {
        throw new Error("Agent root path must be provided for initialization")
      }
      AgentRegistry.instance = new AgentRegistry(agentRoot)
    }
    return AgentRegistry.instance
  }

  /**
   * Scan directory for Python agent files and register them
   */
  public async discoverAgents(category = "uncategorized"): Promise<void> {
    try {
      const files = await fs.readdir(this.agentRoot)
      for (const file of files) {
        if (file.endsWith(".py")) {
          await this.registerAgentFromFile(path.join(this.agentRoot, file), category)
        }
      }
    } catch (error) {
      console.error("Error discovering agents:", error)
    }
  }

  /**
   * Register an agent from a Python file by analyzing its content
   */
  private async registerAgentFromFile(filePath: string, category: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, "utf8")
      const filename = path.basename(filePath)

      // Extract name
      const nameMatch = /class\s+(\w+)/.exec(content) ||
        /def\s+(\w+)/.exec(content) || [null, filename.replace(".py", "")]

      const name = nameMatch[1]?.replace(/_/g, " ")

      // Extract description
      const descMatch = /"""([\s\S]*?)"""|'''([\s\S]*?)'''/.exec(content)
      const description = descMatch ? (descMatch[1] || descMatch[2]).trim() : "No description available"

      // Detect dependencies
      const dependencies: string[] = []
      const importLines = content.match(/^import\s+(\w+)|^from\s+(\w+)/gm) || []
      importLines.forEach((line) => {
        const match = /import\s+(\w+)|from\s+(\w+)/.exec(line)
        if (match) {
          dependencies.push(match[1] || match[2])
        }
      })

      // Detect features
      const features: string[] = []
      if (content.includes("class")) features.push("class-based")
      if (content.includes("def")) features.push("function-based")
      if (content.includes("async def")) features.push("async")
      if (content.includes("import tensorflow") || content.includes("import torch")) features.push("ml")
      if (content.includes("import numpy") || content.includes("import pandas")) features.push("data-science")
      if (content.includes("socket.socket") || content.includes("requests.") || content.includes("http"))
        features.push("network")
      if (content.includes("gpu")) features.push("gpu")
      if (content.includes("memory") || content.includes("cache")) features.push("memory")

      // Create agent definition
      const agent: AgentDefinition = {
        id: filename.replace(".py", "").toLowerCase(),
        name: name,
        file: filename,
        category,
        description: description.substring(0, 200),
        dependencies,
        features,
        status: "inactive",
      }

      this.agents.set(agent.id, agent)
    } catch (error) {
      console.error(`Error registering agent from $Destlin-AI-Gui-main\lib\agent-registry.ts:`, error)
    }
  }

  /**
   * Get all registered agents
   */
  public getAgents(): AgentDefinition[] {
    return Array.from(this.agents.values())
  }

  /**
   * Get agents by category
   */
  public getAgentsByCategory(category: string): AgentDefinition[] {
    return this.getAgents().filter((agent) => agent.category === category)
  }

  /**
   * Execute an agent by ID
   */
  public async executeAgent(id: string, args: string[] = []): Promise<{ success: boolean; output: string }> {
    const agent = this.agents.get(id)
    if (!agent) {
      throw new Error(`Agent with ID ${id} not found`)
    }

    try {
      // Update status
      agent.status = "active"
      agent.lastRun = new Date()

      // Execute the agent
      const command = `python "${path.join(this.agentRoot, agent.file)}" ${args.join(" ")}`
      const output = execSync(command, { encoding: "utf8" })

      // Update status
      agent.status = "inactive"

      return {
        success: true,
        output,
      }
    } catch (error) {
      // Update status
      agent.status = "error"

      return {
        success: false,
        output: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Categorize agents based on filename patterns
   */
  public categorizePredefined(): void {
    const categories = {
      memory: ["memory", "chrono", "cache"],
      logic: ["logic", "router", "validator"],
      swarm: ["swarm", "overseer", "node"],
      gpu: ["gpu", "nvme"],
      quantum: ["quantum"],
      neural: ["neuro", "neural"],
      code: ["code", "mutation", "immuno"],
    }

    for (const agent of this.agents.values()) {
      for (const [category, patterns] of Object.entries(categories)) {
        if (patterns.some((pattern) => agent.id.toLowerCase().includes(pattern))) {
          agent.category = category
          break
        }
      }
    }
  }
}
