import { type NextRequest, NextResponse } from "next/server"
import { tensorAPI } from "@/lib/api/tensor-api-client"

export async function POST(request: NextRequest) {
  try {
    const { modelName, modelPath, computeDevice, hfToken } = await request.json()

    if (!modelName && !modelPath) {
      return NextResponse.json({ error: "Either modelName or modelPath is required" }, { status: 400 })
    }

    // Use the real tensor API to load the model
    const result = await tensorAPI.loadModel({
      model_name_or_path: modelPath || modelName,
      compute_device: computeDevice,
      hf_token: hfToken,
    })

    return NextResponse.json({
      success: true,
      message: `Model ${modelPath || modelName} loaded successfully`,
      model_status: result,
    })
  } catch (error) {
    console.error("Error loading model with tensor engine:", error)
    return NextResponse.json(
      {
        error: "Failed to load model",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
