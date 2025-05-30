"use client"

import { useEffect, useState } from "react"
import { Info, AlertCircle, CheckCircle, X } from "lucide-react"
import type { Notification } from "@/lib/notification-service"
import { useNotifications } from "@/contexts/notification-context"
import { AnimatePresence, motion } from "framer-motion"

export function NotificationToast() {
  const { lastNotification, markAsRead } = useNotifications()
  const [visible, setVisible] = useState(false)
  const [activeNotification, setActiveNotification] = useState<Notification | null>(null)

  useEffect(() => {
    if (lastNotification && lastNotification.id) {
      setActiveNotification(lastNotification)
      setVisible(true)

      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setVisible(false)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [lastNotification])

  // Get icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-amber-500" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  // Handle close
  const handleClose = () => {
    setVisible(false)

    // Mark as read when dismissed
    if (activeNotification) {
      markAsRead(activeNotification.id)
    }
  }

  // Handle click
  const handleClick = () => {
    if (activeNotification) {
      if (activeNotification.actionUrl) {
        window.open(activeNotification.actionUrl, "_blank")
      }

      markAsRead(activeNotification.id)
      setVisible(false)
    }
  }

  return (
    <AnimatePresence>
      {visible && activeNotification && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: 20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -20, x: 20 }}
          className="fixed top-4 right-4 z-50 max-w-sm"
        >
          <div
            className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden"
            onClick={handleClick}
          >
            <div className="flex p-4">
              <div className="flex-shrink-0 mr-3">{getNotificationIcon(activeNotification.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200">{activeNotification.title}</p>
                <p className="text-xs text-slate-400 mt-1">{activeNotification.message}</p>
              </div>
              <button
                className="flex-shrink-0 ml-2 text-slate-400 hover:text-slate-200"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClose()
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="h-1 bg-gradient-to-r from-cyan-500 to-blue-500">
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 5, ease: "linear" }}
                className="h-full"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
