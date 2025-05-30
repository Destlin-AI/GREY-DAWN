"use client"

import { useState, useCallback, useEffect } from "react"

interface Notification {
  id: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  timestamp: Date
  read: boolean
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      // In a real implementation, this would fetch from your API
      // For now, use mock data
      const mockNotifications: Notification[] = [
        {
          id: "1",
          title: "Server Started",
          message: "Tensor server has been started successfully",
          type: "success",
          timestamp: new Date(Date.now() - 300000), // 5 minutes ago
          read: false,
        },
        {
          id: "2",
          title: "Model Loaded",
          message: "Llama 7B model has been loaded successfully",
          type: "info",
          timestamp: new Date(Date.now() - 600000), // 10 minutes ago
          read: false,
        },
        {
          id: "3",
          title: "Memory Warning",
          message: "GPU memory usage is approaching capacity",
          type: "warning",
          timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
          read: true,
        },
      ]

      setNotifications(mockNotifications)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }, [])

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    )
  }, [])

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
  }, [])

  // Add notification
  const addNotification = useCallback((notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
    }

    setNotifications((prev) => [newNotification, ...prev])
  }, [])

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))
  }, [])

  // Initialize notifications
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    markAsRead,
    markAllAsRead,
    addNotification,
    removeNotification,
  }
}
