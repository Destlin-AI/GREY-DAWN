import { NextResponse } from "next/server"
import { spawn } from "child_process"
import path from "path"
import fs from "fs"

// Keep track of the brain's learning
interface BrainMemory {
  conversations: Array<{
    input: string
    response: string
    timestamp: string
    feedback?: "good" | "bad"
  }>
  customInstructions: string[]
  learnedPatterns: Record<string, string>
}

// Initialize brain memory in a persistent file
const BRAIN_MEMORY_PATH = path.join(process.cwd(), "data", "brain-memory.json")

function getBrainMemory(): BrainMemory {
  try {
    if (fs.existsSync(BRAIN_MEMORY_PATH)) {
      const memory = JSON.parse(fs.readFileSync(BRAIN_MEMORY_PATH, "utf8"))
      return memory
    }
  } catch (error) {
    console.error("Error reading brain memory:", error)
  }

  // Default initial brain memory
  return {
    conversations: [],
    customInstructions: [
      "You are an AI assistant helping users with coding and technical tasks.",
      "Be concise and provide helpful code examples when appropriate.",
    ],
    learnedPatterns: {},
  }
}

function saveBrainMemory(memory: BrainMemory) {
  try {
    fs.writeFileSync(BRAIN_MEMORY_PATH, JSON.stringify(memory, null, 2))
  } catch (error) {
    console.error("Error saving brain memory:", error)
  }
}

export async function POST(request: Request) {
  try {
    const { prompt, action = "chat", feedback, conversationId } = await request.json()
    const brainMemory = getBrainMemory()

    // Handle different brain actions
    switch (action) {
      case "chat":
        // Generate context from memory
        const relevantContext = getRelevantContext(prompt, brainMemory)
        const enhancedPrompt = `
          ${brainMemory.customInstructions.join("\n")}
          
          ${relevantContext ? `Previous relevant information: ${relevantContext}` : ""}
          
          User: ${prompt}
          Assistant:
        `.trim()

        // Call the Python LLM script
        const response = await callLlamaBrain(enhancedPrompt)

        // Store conversation in memory
        brainMemory.conversations.push({
          input: prompt,
          response: response,
          timestamp: new Date().toISOString(),
        })
        saveBrainMemory(brainMemory)

        return NextResponse.json({ response })

      case "learn":
        // Add custom instructions or patterns
        if (prompt.startsWith("instruction:")) {
          const instruction = prompt.substring("instruction:".length).trim()
          brainMemory.customInstructions.push(instruction)
        } else if (prompt.includes("=>")) {
          const [pattern, replacement] = prompt.split("=>").map((p) => p.trim())
          brainMemory.learnedPatterns[pattern] = replacement
        }
        saveBrainMemory(brainMemory)
        return NextResponse.json({ success: true, message: "Brain has learned new information" })

      case "feedback":
        // Process feedback for a conversation
        if (conversationId && (feedback === "good" || feedback === "bad")) {
          const conversationIndex = Number.parseInt(conversationId)
          if (brainMemory.conversations[conversationIndex]) {
            brainMemory.conversations[conversationIndex].feedback = feedback
            saveBrainMemory(brainMemory)

            // If feedback is good, try to automatically extract patterns
            if (feedback === "good") {
              const conversation = brainMemory.conversations[conversationIndex]
              const patterns = extractPatterns(conversation.input, conversation.response)
              for (const [pattern, replacement] of Object.entries(patterns)) {
                brainMemory.learnedPatterns[pattern] = replacement
              }
              saveBrainMemory(brainMemory)
            }

            return NextResponse.json({ success: true, message: "Feedback recorded" })
          }
        }
        return NextResponse.json({ success: false, message: "Invalid feedback or conversation ID" }, { status: 400 })

      case "self-improve":
        // Let the LLM analyze its own conversations and suggest improvements
        const improvementPrompt = `
          You are an AI system analyzing your own past conversations to improve.
          Review these conversations and suggest specific improvements to your reasoning, knowledge, or response style.
          Also identify any patterns that could be automated for better responses.
          
          ${JSON.stringify(brainMemory.conversations.slice(-5))}
        `

        const improvements = await callLlamaBrain(improvementPrompt)

        // Process the AI's suggestions for self-improvement
        brainMemory.customInstructions.push(`Self-improvement note: ${improvements}`)
        saveBrainMemory(brainMemory)

        return NextResponse.json({
          success: true,
          message: "Self-improvement complete",
          improvements,
        })

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Brain API error:", error)
    return NextResponse.json({ error: "Failed to process brain request" }, { status: 500 })
  }
}

// Call the Python Llama brain script
async function callLlamaBrain(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(process.cwd(), "scripts", "chat_with_brain.py")

    // Create scripts directory if it doesn't exist
    const scriptsDir = path.join(process.cwd(), "scripts")
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir)
    }

    // Ensure the Python script exists
    if (!fs.existsSync(pythonScript)) {
      // Copy the script file to the scripts directory
      const sourceScript = path.join(process.cwd(), "chat_with_brain.py")
      if (fs.existsSync(sourceScript)) {
        fs.copyFileSync(sourceScript, pythonScript)
      } else {
        reject(new Error("chat_with_brain.py not found"))
        return
      }
    }

    // Run the Python script
    const pythonProcess = spawn("python", [pythonScript, prompt])

    let outputData = ""
    let errorData = ""

    pythonProcess.stdout.on("data", (data) => {
      outputData += data.toString()
    })

    pythonProcess.stderr.on("data", (data) => {
      errorData += data.toString()
    })

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        console.error(`Python process exited with code ${code}`)
        console.error(errorData)
        reject(new Error(`Python process failed with error: ${errorData}`))
      } else {
        resolve(outputData.trim())
      }
    })
  })
}

// Get relevant context from memory based on the current prompt
function getRelevantContext(prompt: string, memory: BrainMemory): string {
  // Simple keyword matching to find relevant prior conversations
  const relevantConversations = memory.conversations
    .filter((conv) => {
      return prompt.split(" ").some((word) => conv.input.toLowerCase().includes(word.toLowerCase()) && word.length > 3)
    })
    .slice(-2) // Just take the 2 most recent matching conversations

  if (relevantConversations.length === 0) return ""

  return relevantConversations.map((conv) => `Q: ${conv.input}\nA: ${conv.response}`).join("\n\n")
}

// Extract patterns from good responses
function extractPatterns(input: string, response: string): Record<string, string> {
  // This is a simplified implementation
  // In a real system, this would use more sophisticated pattern extraction
  const patterns: Record<string, string> = {}

  // Look for potential command patterns
  if (input.toLowerCase().includes("how to") && response.includes("")) {
    const command = input.toLowerCase().replace("how to", "").trim()
    const codeMatch = response.match(/(?:bash)?\s*(.*?)\s*```/s)
    if (codeMatch && codeMatch[1]) {
      patterns[command] = codeMatch[1].trim()
    }
  }

  return patterns
}

// GET endpoint to retrieve brain status and memory stats
export async function GET() {
  const memory = getBrainMemory()

  return NextResponse.json({
    status: "active",
    memory: {
      conversationCount: memory.conversations.length,
      instructionCount: memory.customInstructions.length,
      patternCount: Object.keys(memory.learnedPatterns).length,
    },
    model: "Llama-3-8B-Instruct",
  })
}
