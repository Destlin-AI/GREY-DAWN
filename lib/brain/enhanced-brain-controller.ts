export class EnhancedBrainController {
  private coordinatorModel = "mistralai/Mistral-7B-Instruct-v0.2"
  private workerModels: string[] = ["mistralai/Mistral-7B-Instruct-v0.2", "google/gemma-7b-it"]
  private activeAgents = 0
  private memoryStore: Map<string, any> = new Map()
  private selfRepairEnabled = true
  private localEndpoint = "http://localhost:1234/v1" // LM Studio default endpoint

  constructor() {
    console.log("Enhanced Brain Controller initialized")
    // Initialize memory store with system context
    this.memoryStore.set("system", {
      startTime: new Date().toISOString(),
      version: "1.0.0",
      capabilities: ["text-generation", "code-analysis", "self-repair"],
    })
  }

  public getCoordinatorModel(): string {
    return this.coordinatorModel
  }

  public getActiveAgentCount(): number {
    return this.activeAgents
  }

  public async process(input: string, context: any = {}): Promise<any> {
    const startTime = Date.now()

    try {
      this.activeAgents++

      // Store input in memory with timestamp
      const sessionId = context.sessionId || `session-${Date.now()}`
      if (!this.memoryStore.has(sessionId)) {
        this.memoryStore.set(sessionId, [])
      }

      const sessionMemory = this.memoryStore.get(sessionId)
      sessionMemory.push({
        role: "user",
        content: input,
        timestamp: new Date().toISOString(),
      })

      // Determine if we need specialized processing
      const needsCodeAnalysis = this.detectCodeContent(input)

      let response
      if (needsCodeAnalysis) {
        response = await this.processCode(input, sessionId)
      } else {
        response = await this.processWithCoordinator(input, sessionId)
      }

      // Store response in memory
      sessionMemory.push({
        role: "assistant",
        content: response.content,
        timestamp: new Date().toISOString(),
      })

      const processingTime = Date.now() - startTime

      return {
        content: response.content,
        processingTime,
        sessionId,
        model: response.model || this.coordinatorModel,
      }
    } catch (error) {
      console.error("Brain processing error:", error)
      return {
        content: "I encountered an error processing your request. Please try again.",
        processingTime: Date.now() - startTime,
        error: true,
      }
    } finally {
      this.activeAgents--
    }
  }

  private detectCodeContent(input: string): boolean {
    // Simple detection of code content
    const codePatterns = [
      /```[\s\S]*?```/, // Markdown code blocks
      /<[a-z]+[^>]*>/i, // HTML tags
      /function\s+\w+\s*\(/, // JavaScript functions
      /class\s+\w+/, // Class definitions
      /import\s+[\w\s,{}]*\s+from/, // ES6 imports
      /const\s+\w+\s*=/, // Variable declarations
      /def\s+\w+\s*\(/, // Python functions
      /public\s+(static\s+)?\w+\s+\w+\s*\(/, // Java/C# methods
    ]

    return codePatterns.some((pattern) => pattern.test(input))
  }

  private async processCode(input: string, sessionId: string): Promise<any> {
    console.log("Processing code input")

    // Extract code blocks if present
    const codeBlockRegex = /```(?:\w+)?\s*([\s\S]*?)```/g
    const matches = [...input.matchAll(codeBlockRegex)]
    const codeBlocks = matches.map((match) => match[1].trim())

    const codeToAnalyze = codeBlocks.length > 0 ? codeBlocks.join("\n\n") : input

    // Prepare prompt for code analysis
    const prompt = `
You are an expert code reviewer and developer. Analyze this code:

${codeToAnalyze}

Provide the following:
1. A brief explanation of what this code does
2. Any potential bugs or issues
3. Suggestions for improvement
4. If there are critical errors, provide corrected code

Be specific and actionable in your feedback.
`

    try {
      // Use local LM Studio endpoint instead of Hugging Face
      const response = await this.queryLocalLLM(prompt)

      return {
        content: response,
        model: this.coordinatorModel,
        type: "code-analysis",
      }
    } catch (error) {
      console.error("Code processing error:", error)
      return {
        content: "I encountered an error analyzing this code. Please try again with a different code sample.",
        model: this.coordinatorModel,
        error: true,
      }
    }
  }

  private async processWithCoordinator(input: string, sessionId: string): Promise<any> {
    console.log("Processing with coordinator model")

    // Get conversation history
    const sessionMemory = this.memoryStore.get(sessionId) || []
    const recentHistory = sessionMemory.slice(-6) // Last 3 exchanges

    // Format conversation history for the model
    let conversationContext = ""
    if (recentHistory.length > 0) {
      conversationContext = recentHistory
        .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
        .join("\n\n")

      conversationContext = `Previous conversation:\n${conversationContext}\n\n`
    }

    // Prepare the prompt with conversation history
    const prompt = `${conversationContext}User: ${input}\n\nAssistant:`

    try {
      // Use local LM Studio endpoint instead of Hugging Face
      const response = await this.queryLocalLLM(prompt)

      // Extract just the assistant's response
      const assistantResponse = response.split("Assistant:").pop()?.trim() || response

      return {
        content: assistantResponse,
        model: this.coordinatorModel,
        type: "text-generation",
      }
    } catch (error) {
      console.error("Text processing error:", error)
      return {
        content: "I encountered an error processing your request. Please try again.",
        model: this.coordinatorModel,
        error: true,
      }
    }
  }

  // Query the local LM Studio instance
  private async queryLocalLLM(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.localEndpoint}/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "local-model", // LM Studio uses this as a placeholder
          prompt: prompt,
          max_tokens: 1024,
          temperature: 0.7,
          top_p: 0.95,
        }),
      })

      if (!response.ok) {
        throw new Error(`Local LLM API Error: ${response.status} - ${response.statusText}`)
      }

      const result = await response.json()
      return result.choices[0].text
    } catch (error) {
      console.error("Error querying local LLM:", error)
      throw error
    }
  }

  // Self-repair functionality
  public async repairComponent(componentCode: string, errorMessage: string): Promise<string> {
    if (!this.selfRepairEnabled) {
      return "Self-repair is disabled"
    }

    console.log("Attempting to repair component")

    const prompt = `
You are an expert code fixer. The following code has an error:

\`\`\`
${componentCode}
\`\`\`

The error message is: ${errorMessage}

Please fix the code and return ONLY the corrected code without explanations or markdown formatting.
`

    try {
      // Use local LM Studio endpoint instead of Hugging Face
      const response = await this.queryLocalLLM(prompt)

      // Try to extract code between backticks if present
      const codeBlockRegex = /```(?:\w+)?\s*([\s\S]*?)```/
      const match = response.match(codeBlockRegex)

      if (match && match[1]) {
        return match[1].trim()
      }

      // Otherwise return the full response
      return response
    } catch (error) {
      console.error("Code repair error:", error)
      return "Failed to repair component"
    }
  }
}
