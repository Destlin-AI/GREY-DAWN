import { NextResponse } from "next/server"
import { EnhancedBrainController } from "@/lib/brain/enhanced-brain-controller"

// Singleton brain controller
const brainController = new EnhancedBrainController()

export async function POST(request: Request) {
  try {
    const { input, context = {}, mode = "standard" } = await request.json()

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
        mode,
      },
    })
  } catch (error) {
    console.error("Enhanced brain processing error:", error)
    return NextResponse.json({ error: "Failed to process input" }, { status: 500 })
  }
}

// Add a route for component self-repair
export async function PUT(request: Request) {
  try {
    const { componentCode, errorMessage } = await request.json()

    if (!componentCode || !errorMessage) {
      return NextResponse.json(
        {
          error: "Missing required fields: componentCode, errorMessage",
        },
        { status: 400 },
      )
    }

    const repairedCode = await brainController.repairComponent(componentCode, errorMessage)

    return NextResponse.json({
      repairedCode,
      success: repairedCode !== "Failed to repair component",
    })
  } catch (error) {
    console.error("Component repair error:", error)
    return NextResponse.json({ error: "Failed to repair component" }, { status: 500 })
  }
}
