import { NextResponse } from "next/server"
import { BrainController } from "@/lib/brain-controller"

// Singleton brain controller
const brainController = new BrainController()

export async function POST(request: Request) {
  try {
    const { input, context = {} } = await request.json()

    if (!input) {
      return NextResponse.json({ error: "No input provided" }, { status: 400 })
    }

    const response = await brainController.process(input, context)

    return NextResponse.json({
      response,
      metadata: {
        model: brainController.getCoordinatorModel(),
        activeAgents: brainController.getActiveAgentCount(),
        processingTime: response.processingTime,
      },
    })
  } catch (error) {
    console.error("Brain processing error:", error)
    return NextResponse.json({ error: "Failed to process input" }, { status: 500 })
  }
}
