import { type NextRequest, NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import fs from "fs"
import path from "path"
import os from "os"

// Convert exec to Promise-based
const execAsync = promisify(exec)

// File to store the server PID
const PID_FILE = path.join(os.tmpdir(), "tensor_server_pid.txt")

export async function POST(req: NextRequest) {
  try {
    // Check if server is already running
    if (fs.existsSync(PID_FILE)) {
      const pid = Number.parseInt(fs.readFileSync(PID_FILE, "utf-8").trim())

      try {
        // Check if process is still running
        const checkCommand = process.platform === "win32" ? `tasklist /FI "PID eq ${pid}" /NH` : `ps -p ${pid} -o pid=`
        const { stdout } = await execAsync(checkCommand, { timeout: 5000 })

        if (
          (process.platform === "win32" && stdout.includes(pid.toString())) ||
          (process.platform !== "win32" && stdout.trim())
        ) {
          return NextResponse.json({ error: "Server is already running" }, { status: 400 })
        }
      } catch (error) {
        // Process not running, continue with startup
        console.log("Previous server process not found, starting new server")
      }
    }

    // Parse request body
    const { serverPath, configPath } = await req.json()

    if (!serverPath) {
      return NextResponse.json({ error: "Server script path is required" }, { status: 400 })
    }

    // Validate paths
    if (!fs.existsSync(serverPath)) {
      return NextResponse.json({ error: "Server script not found" }, { status: 400 })
    }

    if (configPath && !fs.existsSync(configPath)) {
      return NextResponse.json({ error: "Config file not found" }, { status: 400 })
    }

    // Determine how to run the script based on file extension
    const isWindows = process.platform === "win32"
    const isPython = serverPath.toLowerCase().endsWith(".py")

    let command
    if (isPython) {
      // Use python interpreter
      const pythonCmd = isWindows ? "python" : "python3"
      command = `${pythonCmd} "${serverPath}"${configPath ? ` "${configPath}"` : ""}`
    } else {
      // Assume executable
      command = `"${serverPath}"${configPath ? ` "${configPath}"` : ""}`
    }

    // Add nohup on Unix systems to keep process running after API returns
    if (!isWindows) {
      command = `nohup ${command} > /dev/null 2>&1 &`
    }

    // Execute the command
    const { stdout, stderr } = await execAsync(command)

    // On Windows, we need to extract the PID differently
    let pid
    if (isWindows) {
      // This is a simplified approach - in a real implementation, you would need
      // to capture the PID from the process
      pid = "unknown" // Placeholder
    } else {
      // On Unix, the last number in the output should be the PID
      const match = stdout.match(/\d+$/)
      pid = match ? match[0] : "unknown"
    }

    // Save PID to file
    fs.writeFileSync(PID_FILE, pid.toString())

    return NextResponse.json({
      success: true,
      message: "Server started successfully",
      pid: pid,
    })
  } catch (error) {
    console.error("Error starting server:", error)
    return NextResponse.json(
      {
        error: "Failed to start server",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
