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

export async function GET(req: NextRequest) {
  try {
    // Validate PID file path
    if (!fs.existsSync(PID_FILE)) {
      return NextResponse.json({
        running: false,
        error: "No server process found",
      })
    }

    // Read and validate PID
    const pidContent = fs.readFileSync(PID_FILE, "utf-8").trim()
    const pid = Number.parseInt(pidContent)

    if (isNaN(pid) || pid <= 0) {
      // Invalid PID, clean up file
      fs.unlinkSync(PID_FILE)
      return NextResponse.json({
        running: false,
        error: "Invalid process ID found",
      })
    }

    // Check if process is still running with timeout
    try {
      const checkCommand = process.platform === "win32" ? `tasklist /FI "PID eq ${pid}" /NH` : `ps -p ${pid} -o pid=`

      const { stdout } = await execAsync(checkCommand, { timeout: 5000 })

      if (process.platform === "win32") {
        // Windows tasklist returns info if process exists
        if (!stdout.includes(pid.toString())) {
          throw new Error("Process not found")
        }
      } else {
        // Unix ps returns the PID if process exists
        if (!stdout.trim()) {
          throw new Error("Process not found")
        }
      }

      // Process exists, try to get additional info with timeout
      let additionalInfo = {}
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2000)

        const infoResponse = await fetch("http://127.0.0.1:8000/api/status", {
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (infoResponse.ok) {
          additionalInfo = await infoResponse.json()
        }
      } catch (error) {
        // API might not be ready yet, that's fine
        console.log("Could not fetch API status, server might still be starting up")
      }

      return NextResponse.json({
        running: true,
        pid,
        api: {
          url: "http://127.0.0.1:8000",
        },
        ...additionalInfo,
      })
    } catch (error) {
      // Process no longer exists, clean up PID file
      try {
        fs.unlinkSync(PID_FILE)
      } catch (cleanupError) {
        console.error("Error cleaning up PID file:", cleanupError)
      }

      return NextResponse.json({
        running: false,
        error: "Server process not found",
      })
    }
  } catch (error) {
    console.error("Error checking server status:", error)
    return NextResponse.json(
      {
        error: "Failed to check server status",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
