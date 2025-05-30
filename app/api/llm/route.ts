import { NextResponse } from "next/server"
import { spawn } from "child_process"
import path from "path"
import { promises as fs } from "fs"

// Process input using local LLM via Python script
async function processWithLocalLLM(input: string) {
  try {
    // Determine the path to the Python script
    const scriptPath = process.env.AGENT_PATH || path.join(process.cwd(), "codyfile", "chat_with_brain.py")

    // Check if the script exists
    try {
      await fs.access(scriptPath)
    } catch (error) {
      console.error(`Python script not found at ${scriptPath}`)
      return {
        type: "assistant",
        content: "Error: LLM script not found. Please check your configuration.",
      }
    }

    // Spawn Python process
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn("python", [scriptPath, input])

      let outputData = ""
      let errorData = ""

      pythonProcess.stdout.on("data", (data) => {
        outputData += data.toString()
      })

      pythonProcess.stderr.on("data", (data) => {
        errorData += data.toString()
        console.error(`Python stderr: ${data}`)
      })

      pythonProcess.on("close", (code) => {
        if (code !== 0) {
          console.error(`Python process exited with code ${code}`)
          console.error(`Error output: ${errorData}`)

          // Fallback to simple responses if Python fails
          if (input.toLowerCase().includes("help")) {
            resolve({
              type: "assistant",
              content:
                "I'm an AI assistant integrated with the NEXUS OS console. I can help with system commands and answer questions about the system. Try asking 'What can this system do?' or 'How to optimize system performance?'",
            })
          } else {
            resolve({
              type: "assistant",
              content: `I processed your input: "${input}". For more specific information, try asking a more detailed question about the NEXUS OS system.`,
            })
          }
        } else {
          resolve({
            type: "assistant",
            content: outputData.trim(),
          })
        }
      })
    })
  } catch (error) {
    console.error("Error processing with local LLM:", error)

    // Fallback responses
    if (input.toLowerCase().includes("help")) {
      return {
        type: "assistant",
        content:
          "I'm an AI assistant integrated with the NEXUS OS console. I can help with system commands and answer questions about the system. Try asking 'What can this system do?' or 'How to optimize system performance?'",
      }
    }

    if (input.toLowerCase().includes("what can this system do")) {
      return {
        type: "assistant",
        content:
          "NEXUS OS provides system monitoring, file management, process control, network analysis, and security features. You can use commands like 'status', 'ls', 'cat' to interact with the system, or ask me questions about specific functionality.",
      }
    }

    return {
      type: "assistant",
      content: `I processed your input: "${input}". For more specific information, try asking a more detailed question about the NEXUS OS system.`,
    }
  }
}

export async function POST(request: Request) {
  try {
    const { input } = await request.json()

    if (!input) {
      return NextResponse.json({ error: "No input provided" }, { status: 400 })
    }

    const response = await processWithLocalLLM(input)
    return NextResponse.json(response)
  } catch (error) {
    console.error("LLM processing error:", error)
    return NextResponse.json({ error: "Failed to process input" }, { status: 500 })
  }
}
