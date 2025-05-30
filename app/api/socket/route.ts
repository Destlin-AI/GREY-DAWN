import { NextResponse } from "next/server"

// We need to disable socket.io in this implementation since it's causing issues
// Instead, we'll use a simpler approach for notifications

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    return NextResponse.json({ status: "Socket service is disabled. Using polling for notifications instead." })
  } catch (error) {
    console.error("Socket server error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
