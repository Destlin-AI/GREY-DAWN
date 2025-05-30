import { type NextRequest, NextResponse } from "next/server"
import { tensorAPI } from "@/lib/api/tensor-api-client"

export async function POST(request: NextRequest) {
  try {
    const { layerId, device, priority } = await request.json()

    if (!layerId || !device) {
      return NextResponse.json({ error: "Missing layerId or device" }, { status: 400 })
    }

    // Use the real tensor API to transfer the layer
    await tensorAPI.transferLayer({
      layer_id: layerId,
      destination_device: device,
      priority: priority || 5,
    })

    return NextResponse.json({
      success: true,
      message: `Layer ${layerId} allocation to ${device} requested successfully`,
      layerId,
      device,
    })
  } catch (error) {
    console.error("Error allocating layer with tensor engine:", error)
    return NextResponse.json(
      {
        error: "Failed to allocate layer",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
