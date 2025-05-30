import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

// Define agent categories for organization
const AGENT_CATEGORIES = {
  memory: ["memory", "chrono", "cache", "archiver", "tracker", "visualizer"],
  logic: ["logic", "router", "validator", "scheduler", "dispatcher"],
  swarm: ["swarm", "overseer", "node", "throttle", "controller"],
  gpu: ["gpu", "nvme", "entropy"],
  quantum: ["quantum", "etl", "quant"],
  neural: ["neuro", "neural", "brain", "avatar"],
  code: ["code", "mutation", "immuno", "writer", "fragment"],
}

// Agent interface
interface Agent {
  id: string
  name: string
  file: string
  category: string
  description: string
  status: "active" | "inactive" | "error"
  lastRun?: Date
  features: string[]
}

// Cache discovered agents
let agentCache: Agent[] = []
let lastDiscovery = 0

// Path to agent scripts - configure for your environment
const AGENT_PATH = process.env.AGENT_PATH || path.join(process.cwd(), "agents")

export async function GET() {
  try {
    // Only rediscover agents every 60 seconds
    const now = Date.now()
    if (now - lastDiscovery > 60000 || agentCache.length === 0) {
      await discoverAgents()
      lastDiscovery = now
    }

    return NextResponse.json({ agents: agentCache })
  } catch (error) {
    console.error("Error fetching agents:", error)
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { action, agentId, params } = await request.json()

    if (action === "execute") {
      // Find the agent
      const agent = agentCache.find((a) => a.id === agentId)
      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 })
      }

      // Execute the agent
      const result = await executeAgent(agent, params)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error processing agent request:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}

async function discoverAgents() {
  try {
    // Check if directory exists
    try {
      await fs.access(AGENT_PATH)
    } catch {
      // Create directory if it doesn't exist
      await fs.mkdir(AGENT_PATH, { recursive: true })

      // No agents to discover yet
      agentCache = []
      return
    }

    // Get all Python files
    const files = await fs.readdir(AGENT_PATH)
    const pythonFiles = files.filter((file) => file.endsWith(".py"))

    // Process each file
    const agents: Agent[] = []
    for (const file of pythonFiles) {
      const filePath = path.join(AGENT_PATH, file)
      const content = await fs.readFile(filePath, "utf8")

      // Determine agent name and description
      const id = file.replace(".py", "")
      const nameMatch = content.match(/class\s+(\w+)|def\s+(\w+)_main/)
      const name = nameMatch ? (nameMatch[1] || nameMatch[2]).replace(/_/g, " ") : id.replace(/_/g, " ")

      // Extract description from docstring
      const descMatch = content.match(/"""([\s\S]*?)"""|'''([\s\S]*?)'''/)
      const description = descMatch ? (descMatch[1] || descMatch[2]).trim().split("\n")[0] : `Agent for ${name}`

      // Determine category
      let category = "other"
      for (const [cat, keywords] of Object.entries(AGENT_CATEGORIES)) {
        if (keywords.some((kw) => id.toLowerCase().includes(kw))) {
          category = cat
          break
        }
      }

      // Detect features
      const features: string[] = []
      if (content.includes("import tensorflow") || content.includes("import torch")) features.push("ml")
      if (content.includes("import numpy") || content.includes("import pandas")) features.push("data-science")
      if (content.includes("import requests") || content.includes("socket.socket")) features.push("network")
      if (content.includes("multiprocessing") || content.includes("threading")) features.push("parallel")
      if (content.includes("async def")) features.push("async")
      if (content.includes("gpu") || content.includes("cuda")) features.push("gpu")

      agents.push({
        id,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        file,
        category,
        description,
        status: "inactive",
        features,
      })
    }

    agentCache = agents
  } catch (error) {
    console.error("Error discovering agents:", error)
    throw error
  }
}

async function executeAgent(agent: Agent, params: any = {}) {
  try {
    // Mark agent as active
    const agentIndex = agentCache.findIndex((a) => a.id === agent.id)
    if (agentIndex >= 0) {
      agentCache[agentIndex].status = "active"
      agentCache[agentIndex].lastRun = new Date()
    }

    // Prepare parameters as JSON file
    const paramsFile = path.join(AGENT_PATH, `${agent.id}_params_${Date.now()}.json`)
    await fs.writeFile(paramsFile, JSON.stringify(params || {}), "utf8")

    // Execute the agent
    const scriptPath = path.join(AGENT_PATH, agent.file)
    const { stdout, stderr } = await execAsync(`python "${scriptPath}" --params "${paramsFile}"`, {
      timeout: 30000, // 30 second timeout for safety
    })

    // Clean up params file
    try {
      await fs.unlink(paramsFile)
    } catch (err) {
      console.error("Error removing params file:", err)
    }

    // Mark agent as inactive
    if (agentIndex >= 0) {
      agentCache[agentIndex].status = "inactive"
    }

    return {
      success: true,
      output: stdout,
      error: stderr || null,
    }
  } catch (error) {
    // Mark agent as error
    const agentIndex = agentCache.findIndex((a) => a.id === agent.id)
    if (agentIndex >= 0) {
      agentCache[agentIndex].status = "error"
    }

    return {
      success: false,
      output: null,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
