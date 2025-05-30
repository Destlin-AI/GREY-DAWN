"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { Notification } from "@/lib/notification-service"
import { useSocket } from "@/hooks/use-socket"

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  lastNotification: Notification | null
  isLoading: boolean
  error: Error | null
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  clearAllNotifications: () => Promise<void>
  refreshNotifications: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const { lastNotification } = useSocket()

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications()

    // Set up polling for notifications
    const interval = setInterval(() => {
      fetchNotifications(false) // Don't show loading state for background refreshes
    }, 10000) // Refresh every 10 seconds

    return () => clearInterval(interval)
  }, [])

  // Update notifications when a new one is received via polling
  useEffect(() => {
    if (lastNotification) {
      // Check if we already have this notification
      const exists = notifications.some((n) => n.id === lastNotification.id)

      if (!exists) {
        setNotifications((prev) => [lastNotification, ...prev])

        // Show browser notification if supported
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(lastNotification.title, {
            body: lastNotification.message,
          })
        }
      }
    }
  }, [lastNotification, notifications])

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "denied") {
      Notification.requestPermission()
    }
  }, [])

  // Fetch all notifications
  const fetchNotifications = async (showLoading = true) => {
    if (showLoading) setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/notifications")

      if (!response.ok) {
        throw new Error("Failed to fetch notifications")
      }

      const data = await response.json()
      setNotifications(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("An unknown error occurred"))
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }

  // Mark a notification as read
  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
      })

      if (!response.ok) {
        throw new Error("Failed to mark notification as read")
      }

      setNotifications((prev) =>
        prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
      )
    } catch (err) {
      setError(err instanceof Error ? err : new Error("An unknown error occurred"))
    }
  }

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to mark all notifications as read")
      }

      setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
    } catch (err) {
      setError(err instanceof Error ? err : new Error("An unknown error occurred"))
    }
  }

  // Delete a notification
  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete notification")
      }

      setNotifications((prev) => prev.filter((notification) => notification.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err : new Error("An unknown error occurred"))
    }
  }

  // Clear all notifications
  const clearAllNotifications = async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to clear notifications")
      }

      setNotifications([])
    } catch (err) {
      setError(err instanceof Error ? err : new Error("An unknown error occurred"))
    }
  }

  // Refresh notifications
  const refreshNotifications = async () => {
    await fetchNotifications()
  }

  // Calculate unread count
  const unreadCount = notifications.filter((notification) => !notification.read).length

  const value = {
    notifications,
    unreadCount,
    lastNotification,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    refreshNotifications,
  }

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const context = useContext(NotificationContext)

  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }

  return context
}
