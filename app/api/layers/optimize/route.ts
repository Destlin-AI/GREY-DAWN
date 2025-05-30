import { type NextRequest, NextResponse } from "next/server"
import { tensorAPI } from "@/lib/api/tensor-api-client"

export async function POST(req: NextRequest) {
  try {
    // Call the real tensor engine optimization endpoint
    // This would typically involve calling a method like tensorAPI.optimizeLayers()
    // For now, we'll use the server status to check if the server is running
    const status = await tensorAPI.getServerStatus()

    if (!status.server_status || status.server_status !== "running") {
      return NextResponse.json({ error: "Tensor server is not running" }, { status: 400 })
    }

    // In a real implementation, we would call the actual optimization endpoint
    // For now, we'll return a success message
    return NextResponse.json({
      success: true,
      message: "Layer allocation optimization requested",
      server_status: status.server_status,
    })
  } catch (error) {
    console.error("Error optimizing layers with tensor engine:", error)
    return NextResponse.json(
      {
        error: "Failed to optimize layer allocation",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
