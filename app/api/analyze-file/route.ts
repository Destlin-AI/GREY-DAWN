import { NextResponse } from "next/server"
import { queryHuggingFace } from "@/lib/huggingface-client"

const CODE_ANALYSIS_PROMPTS = {
  js: "Analyze this JavaScript code and suggest improvements:",
  ts: "Analyze this TypeScript code and suggest improvements:",
  py: "Analyze this Python code and suggest improvements:",
  json: "Analyze this JSON file and suggest improvements:",
  default: "Analyze this code and suggest improvements:",
}

export async function POST(request: Request) {
  try {
    const { content, fileType } = await request.json()

    if (!content) {
      return NextResponse.json({ error: "No content provided" }, { status: 400 })
    }

    // Determine the appropriate prompt based on file type
    const extension = fileType.replace(".", "").toLowerCase()
    const promptPrefix =
      CODE_ANALYSIS_PROMPTS[extension as keyof typeof CODE_ANALYSIS_PROMPTS] || CODE_ANALYSIS_PROMPTS.default

    // Prepare the prompt with the content
    const prompt = `${promptPrefix}\n\n\`\`\`${extension}\n${content}\n\`\`\`\n\nProvide 3 specific suggestions to improve this code:`

    // Query Hugging Face model
    // You can replace the model with any code-specialized model you prefer
    const result = await queryHuggingFace("mistralai/Mistral-7B-Instruct-v0.2", {
      inputs: prompt,
      parameters: {
        max_new_tokens: 512,
        temperature: 0.7,
        top_p: 0.95,
        do_sample: true,
      },
    })

    // Process the response - extract numbered suggestions
    const suggestions = processSuggestions(result[0].generated_text)

    return NextResponse.json({
      suggestions,
      rawResponse: result[0].generated_text,
    })
  } catch (error) {
    console.error("File analysis error:", error)
    return NextResponse.json({ error: "Failed to analyze file" }, { status: 500 })
  }
}

// Helper function to extract suggestions from model output
function processSuggestions(text: string): string[] {
  try {
    // Extract the part after the prompt
    const responseOnly = text.split("Provide 3 specific suggestions to improve this code:")[1] || text

    // Look for numbered suggestions
    const regex = /\d+[).]\s+(.*?)(?=\d+[).]\s+|$)/gs
    const matches = [...responseOnly.matchAll(regex)]

    if (matches.length > 0) {
      return matches.map((m) => m[1].trim())
    }

    // If no numbered matches, split by paragraphs and return non-empty ones
    return responseOnly
      .split("\n\n")
      .filter((p) => p.trim().length > 0)
      .slice(0, 3)
  } catch (e) {
    console.error("Error processing suggestions:", e)
    return ["Failed to parse suggestions from model output. Please try again."]
  }
}
