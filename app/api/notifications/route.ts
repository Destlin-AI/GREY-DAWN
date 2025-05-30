import { NextResponse } from "next/server"
import { NotificationService } from "@/lib/notification-service"

// Get all notifications
export async function GET() {
  try {
    const notifications = NotificationService.getAll()
    return NextResponse.json(notifications)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }
}

// Create a new notification
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.title || !body.message || !body.type) {
      return NextResponse.json({ error: "Missing required fields: title, message, type" }, { status: 400 })
    }

    // Validate notification type
    const validTypes = ["info", "success", "warning", "error"]
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: "Invalid notification type. Must be one of: info, success, warning, error" },
        { status: 400 },
      )
    }

    const notification = NotificationService.create({
      title: body.title,
      message: body.message,
      type: body.type,
      actionUrl: body.actionUrl,
    })

    // We no longer emit to WebSocket since we're using polling

    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 })
  }
}

// Delete all notifications
export async function DELETE() {
  try {
    NotificationService.clearAll()
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to clear notifications" }, { status: 500 })
  }
}
