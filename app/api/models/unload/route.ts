import { type NextRequest, NextResponse } from "next/server"
import { tensorAPI } from "@/lib/api/tensor-api-client"

export async function POST(req: NextRequest) {
  try {
    // Use the real tensor API to unload the model
    const result = await tensorAPI.unloadModel()

    return NextResponse.json({
      success: true,
      message: "Model unloaded successfully",
      model_status: result,
    })
  } catch (error) {
    console.error("Error unloading model with tensor engine:", error)
    return NextResponse.json(
      {
        error: "Failed to unload model",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
