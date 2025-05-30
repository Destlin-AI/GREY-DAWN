import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import os from "os"

// File to store the current config path
const CONFIG_PATH_FILE = path.join(os.tmpdir(), "tensor_config_path.txt")

export async function GET(req: NextRequest) {
  try {
    // Check if we know the config path
    if (!fs.existsSync(CONFIG_PATH_FILE)) {
      return NextResponse.json({ error: "Config path not known" }, { status: 400 })
    }

    // Read config path
    const configPath = fs.readFileSync(CONFIG_PATH_FILE, "utf-8").trim()

    // Check if config file exists
    if (!fs.existsSync(configPath)) {
      return NextResponse.json({ error: "Config file not found" }, { status: 404 })
    }

    // Read and parse config
    const configContent = fs.readFileSync(configPath, "utf-8")
    const config = JSON.parse(configContent)

    return NextResponse.json(config)
  } catch (error) {
    console.error("Error fetching config:", error)
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check if we know the config path
    if (!fs.existsSync(CONFIG_PATH_FILE)) {
      return NextResponse.json({ error: "Config path not known. Start the server first." }, { status: 400 })
    }

    // Read config path
    const configPath = fs.readFileSync(CONFIG_PATH_FILE, "utf-8").trim()

    // Parse request body
    const newConfig = await req.json()

    // Write updated config to file
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2))

    // Try to notify the server of config change via API
    try {
      const response = await fetch("http://127.0.0.1:8080/reload_config", {
        method: "POST",
        signal: AbortSignal.timeout(2000), // 2 second timeout
      })

      if (response.ok) {
        return NextResponse.json({ success: true, reloaded: true })
      }
    } catch (error) {
      console.log("Could not notify server of config change. Server will use updated config on next start.")
    }

    return NextResponse.json({ success: true, reloaded: false })
  } catch (error) {
    console.error("Error updating config:", error)
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 })
  }
}
