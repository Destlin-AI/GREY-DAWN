import { v4 as uuidv4 } from "uuid"

export interface Notification {
  id: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  timestamp: number
  read: boolean
  actionUrl?: string
}

// In-memory store for notifications (in a real app, use a database)
let notifications: Notification[] = []

export const NotificationService = {
  // Get all notifications
  getAll: () => {
    return [...notifications]
  },

  // Get unread notifications
  getUnread: () => {
    return notifications.filter((notification) => !notification.read)
  },

  // Create a new notification
  create: (data: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      id: uuidv4(),
      timestamp: Date.now(),
      read: false,
      ...data,
    }

    notifications.unshift(newNotification)

    // Keep only the latest 100 notifications
    if (notifications.length > 100) {
      notifications = notifications.slice(0, 100)
    }

    return newNotification
  },

  // Mark a notification as read
  markAsRead: (id: string) => {
    const notification = notifications.find((n) => n.id === id)
    if (notification) {
      notification.read = true
      return true
    }
    return false
  },

  // Mark all notifications as read
  markAllAsRead: () => {
    notifications.forEach((notification) => {
      notification.read = true
    })
    return true
  },

  // Delete a notification
  delete: (id: string) => {
    const initialLength = notifications.length
    notifications = notifications.filter((n) => n.id !== id)
    return notifications.length !== initialLength
  },

  // Clear all notifications
  clearAll: () => {
    notifications = []
    return true
  },
}
