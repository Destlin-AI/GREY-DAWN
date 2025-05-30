import { NextResponse } from "next/server"
import { NotificationService } from "@/lib/notification-service"

// Mark all notifications as read
export async function POST() {
  try {
    NotificationService.markAllAsRead()
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to mark notifications as read" }, { status: 500 })
  }
}
