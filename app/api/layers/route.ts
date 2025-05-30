import { type NextRequest, NextResponse } from "next/server"
import { tensorAPI } from "@/lib/api/tensor-api-client"

export async function GET(req: NextRequest) {
  try {
    // Use the real tensor API client to fetch layers
    const layers = await tensorAPI.getLayers()
    return NextResponse.json(layers)
  } catch (error) {
    console.error("Error fetching layers from tensor engine:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch layers from tensor engine",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
