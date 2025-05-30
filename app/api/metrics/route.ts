import { NextResponse } from "next/server"
import type { SystemMetrics } from "@/lib/api"

export async function GET() {
  try {
    // In a real application, this would fetch data from your backend services
    // For now, we'll return realistic-looking mock data
    const metrics: SystemMetrics = {
      cpuUsage: Math.floor(Math.random() * 30) + 30,
      memoryUsage: Math.floor(Math.random() * 20) + 60,
      networkStatus: Math.floor(Math.random() * 15) + 80,
      systemStatus: Math.floor(Math.random() * 10) + 80,
      securityLevel: Math.floor(Math.random() * 15) + 70,
    }

    return NextResponse.json(metrics)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch system metrics" }, { status: 500 })
  }
}
