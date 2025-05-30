import { type NextRequest, NextResponse } from "next/server"
import path from "path"
import { exec } from "child_process"
import { promisify } from "util"
import * as fs_old from "fs"

const execAsync = promisify(exec)

// Path to the tensor server scripts
const SCRIPTS_PATH = process.env.TENSOR_SCRIPTS_PATH || path.join(process.cwd(), "tensor_scripts")
const CONFIG_PATH = path.join(SCRIPTS_PATH, "configs")

// Ensure directories exist
if (!fs_old.existsSync(CONFIG_PATH)) {
  fs_old.mkdirSync(CONFIG_PATH, { recursive: true })
}

// Simple cache for model list to avoid repeated disk operations
let modelCache: any = null
let lastCacheTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function GET(req: NextRequest) {
  try {
    // Check if we have a fresh cache
    const now = Date.now()
    if (modelCache && now - lastCacheTime < CACHE_TTL) {
      return NextResponse.json({ models: modelCache })
    }

    // Try to get model list from server API first
    try {
      const response = await fetch("http://127.0.0.1:8080/models", {
        signal: AbortSignal.timeout(2000), // 2 second timeout
      })

      if (response.ok) {
        const data = await response.json()
        modelCache = data.models || []
        lastCacheTime = now
        return NextResponse.json({ models: modelCache })
      }
    } catch (error) {
      console.log("Could not fetch models from API, falling back to default models")
    }

    // Provide default models if API is not available
    modelCache = [
      { id: "llama-7b", name: "Llama 7B", size: "7B", category: "small" },
      { id: "llama-13b", name: "Llama 13B", size: "13B", category: "medium" },
      { id: "llama-70b", name: "Llama 70B", size: "70B", category: "large" },
      { id: "mistral-7b", name: "Mistral 7B", size: "7B", category: "small" },
      { id: "mixtral-8x7b", name: "Mixtral 8x7B", size: "65B", category: "large" },
    ]
    lastCacheTime = now

    return NextResponse.json({ models: modelCache })
  } catch (error) {
    console.error("Error fetching models:", error)
    return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const { action, modelName } = data

    if (!action) {
      return NextResponse.json({ error: "Missing action parameter" }, { status: 400 })
    }

    if (action === "load" && modelName) {
      // Start tensor server with the specified model
      const result = await loadModel(modelName)
      return NextResponse.json({ success: true, result })
    } else if (action === "unload") {
      // Stop tensor server
      const result = await stopTensorServer()
      return NextResponse.json({ success: true, result })
    } else if (action === "status") {
      // Get tensor server status
      const status = await getTensorServerStatus()
      return NextResponse.json({ success: true, status })
    } else if (action === "optimize") {
      // Optimize layer allocation
      const result = await optimizeLayers()
      return NextResponse.json({ success: true, result })
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in POST /api/models:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}

// Helper functions

async function getAvailableModels() {
  try {
    // This would scan your models directory
    // For now, return mock data
    return [
      {
        name: "llama-7b",
        size: "7B",
        category: "small",
        path: path.join(SCRIPTS_PATH, "models", "llama-7b.gguf"),
        format: "gguf",
      },
      {
        name: "mixtral-8x7b",
        size: "65B",
        category: "large",
        path: path.join(SCRIPTS_PATH, "models", "mixtral-8x7b.gguf"),
        format: "gguf",
      },
      {
        name: "phi-3-mini",
        size: "3.8B",
        category: "tiny",
        path: path.join(SCRIPTS_PATH, "models", "phi-3-mini.gguf"),
        format: "gguf",
      },
    ]
  } catch (error) {
    console.error("Error getting available models:", error)
    throw error
  }
}

async function getTensorServerStatus() {
  try {
    // In a real implementation, you would check if the tensor server is running
    // and query its status endpoint

    // For now, return mock data
    return {
      running: true,
      activeModel: "llama-7b",
      uptime: 3600, // seconds
      hardware: {
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
      },
    }
  } catch (error) {
    console.error("Error getting tensor server status:", error)
    return { running: false, error: error.message }
  }
}

async function loadModel(modelName: string) {
  try {
    // In a real implementation, you would:
    // 1. Create a model-specific config file
    // 2. Run the tensor server with that config

    // For now, just log the action
    console.log(`Loading model: ${modelName}`)

    // Simulate running the script
    // In production, you would use execAsync to run the actual script:
    // await execAsync(`python ${path.join(SCRIPTS_PATH, "run_model.py")} ${modelName}`)

    return { message: `Model ${modelName} loaded successfully` }
  } catch (error) {
    console.error(`Error loading model ${modelName}:`, error)
    throw error
  }
}

async function stopTensorServer() {
  try {
    // In a real implementation, you would stop the tensor server process

    // For now, just log the action
    console.log("Stopping tensor server")

    // In production, you might do something like:
    // await execAsync("pkill -f tensor_server")

    return { message: "Tensor server stopped successfully" }
  } catch (error) {
    console.error("Error stopping tensor server:", error)
    throw error
  }
}

async function optimizeLayers() {
  try {
    // In a real implementation, you would call the tensor server's
    // optimization endpoint or run the auto_allocation script

    // For now, just log the action
    console.log("Optimizing layer allocation")

    // In production, you might do something like:
    // await execAsync(`python ${path.join(SCRIPTS_PATH, "auto_allocation.py")} ${configPath}`)

    return { message: "Layer allocation optimized successfully" }
  } catch (error) {
    console.error("Error optimizing layers:", error)
    throw error
  }
}
