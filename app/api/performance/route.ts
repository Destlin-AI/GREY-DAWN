import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Generate 24 data points for the performance chart
    const performanceData = Array.from({ length: 24 }).map((_, i) => {
      return {
        time: new Date(Date.now() - (23 - i) * 15 * 60 * 1000).toISOString(),
        cpu: Math.floor(Math.random() * 60) + 20,
        memory: Math.floor(Math.random() * 40) + 40,
        network: Math.floor(Math.random() * 30) + 30,
      }
    })

    return NextResponse.json(performanceData)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch performance data" }, { status: 500 })
  }
}
