import { NextResponse } from "next/server"
import { NotificationService } from "@/lib/notification-service"

// Mark a notification as read
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const success = NotificationService.markAsRead(id)

    if (!success) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 })
  }
}

// Delete a notification
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const success = NotificationService.delete(id)

    if (!success) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 })
  }
}
