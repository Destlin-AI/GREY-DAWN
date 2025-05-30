import { NextResponse } from "next/server"
import { NotificationService } from "@/lib/notification-service"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const since = url.searchParams.get("since")
    const sinceTimestamp = since ? Number.parseInt(since) : 0

    // Get all notifications
    const notifications = NotificationService.getAll()

    // Find the most recent notification that's newer than the since timestamp
    const latestNotification = notifications.find((n) => n.timestamp > sinceTimestamp)

    return NextResponse.json({
      notification: latestNotification || null,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch latest notification" }, { status: 500 })
  }
}
