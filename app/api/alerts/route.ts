import { NextResponse } from "next/server"
import type { AlertInfo } from "@/lib/api"

export async function GET() {
  try {
    // Mock data for alerts
    const alerts: AlertInfo[] = [
      {
        id: "alert-1",
        title: "Security Scan Complete",
        time: "14:32:12",
        description: "No threats detected in system scan",
        type: "info",
      },
      {
        id: "alert-2",
        title: "Bandwidth Spike Detected",
        time: "13:45:06",
        description: "Unusual network activity on port 443",
        type: "warning",
      },
      {
        id: "alert-3",
        title: "System Update Available",
        time: "09:12:45",
        description: "Version 12.4.5 ready to install",
        type: "update",
      },
      {
        id: "alert-4",
        title: "Backup Completed",
        time: "04:30:00",
        description: "Incremental backup to drive E: successful",
        type: "success",
      },
    ]

    return NextResponse.json(alerts)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 })
  }
}
