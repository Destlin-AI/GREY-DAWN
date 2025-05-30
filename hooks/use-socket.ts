"use client"

import { useEffect, useState } from "react"
import type { Notification } from "@/lib/notification-service"

export function useSocket() {
  const [isConnected, setIsConnected] = useState(true) // Always consider connected for UI purposes
  const [lastNotification, setLastNotification] = useState<Notification | null>(null)
  const [lastPollTime, setLastPollTime] = useState(Date.now())

  useEffect(() => {
    // Instead of socket.io, we'll use polling to check for new notifications
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch("/api/notifications/latest?since=" + lastPollTime)
        if (response.ok) {
          const data = await response.json()
          if (data && data.notification) {
            setLastNotification(data.notification)
            setLastPollTime(Date.now())
          }
        }
      } catch (error) {
        console.error("Error polling for notifications:", error)
      }
    }, 5000) // Poll every 5 seconds

    return () => {
      clearInterval(pollInterval)
    }
  }, [lastPollTime])

  // This function is kept for API compatibility but doesn't do anything now
  const authenticateUser = (userId: string) => {
    console.log("User authentication simulation for:", userId)
  }

  return {
    isConnected,
    lastNotification,
    authenticateUser,
  }
}
