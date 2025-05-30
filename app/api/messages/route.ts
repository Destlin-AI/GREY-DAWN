import { NextResponse } from "next/server"
import type { MessageInfo } from "@/lib/api"

export async function GET() {
  try {
    // Mock data for messages
    const messages: MessageInfo[] = [
      {
        id: "msg-1",
        sender: "System Administrator",
        time: "15:42:12",
        message: "Scheduled maintenance will occur at 02:00. All systems will be temporarily offline.",
        avatar: "/placeholder.svg?height=40&width=40",
        unread: true,
      },
      {
        id: "msg-2",
        sender: "Security Module",
        time: "14:30:45",
        message: "Unusual login attempt blocked from IP 192.168.1.45. Added to watchlist.",
        avatar: "/placeholder.svg?height=40&width=40",
        unread: true,
      },
      {
        id: "msg-3",
        sender: "Network Control",
        time: "12:15:33",
        message: "Bandwidth allocation adjusted for priority services during peak hours.",
        avatar: "/placeholder.svg?height=40&width=40",
        unread: true,
      },
      {
        id: "msg-4",
        sender: "Data Center",
        time: "09:05:18",
        message: "Backup verification complete. All data integrity checks passed.",
        avatar: "/placeholder.svg?height=40&width=40",
        unread: true,
      },
    ]

    return NextResponse.json(messages)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}
