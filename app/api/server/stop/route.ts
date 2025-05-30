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
    // Check if server is running
    if (!fs.existsSync(PID_FILE)) {
      return NextResponse.json({ error: "Server is not running" }, { status: 400 })
    }

    // Read PID from file
    const pidContent = fs.readFileSync(PID_FILE, "utf-8").trim()
    const pid = Number.parseInt(pidContent)

    if (isNaN(pid) || pid <= 0) {
      // Invalid PID, clean up file
      fs.unlinkSync(PID_FILE)
      return NextResponse.json({ error: "Invalid process ID found" }, { status: 400 })
    }

    // Kill the process
    try {
      if (process.platform === "win32") {
        await execAsync(`taskkill /F /PID ${pid}`, { timeout: 10000 })
      } else {
        await execAsync(`kill -15 ${pid}`, { timeout: 10000 })

        // Check if process is still running after SIGTERM
        setTimeout(async () => {
          try {
            await execAsync(`ps -p ${pid} -o pid=`)
            // If we get here, process is still running, use SIGKILL
            await execAsync(`kill -9 ${pid}`)
          } catch (error) {
            // Process already terminated, which is good
          }
        }, 5000)
      }

      // Remove PID file
      fs.unlinkSync(PID_FILE)

      return NextResponse.json({
        success: true,
        message: "Server stopped successfully",
      })
    } catch (error) {
      console.error("Error stopping server process:", error)

      // Clean up PID file anyway
      try {
        fs.unlinkSync(PID_FILE)
      } catch (cleanupError) {
        console.error("Error cleaning up PID file:", cleanupError)
      }

      return NextResponse.json(
        {
          error: "Failed to stop server process",
          detail: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error handling stop request:", error)
    return NextResponse.json(
      {
        error: "Failed to process stop request",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
