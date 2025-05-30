"use client"

import type React from "react"

import { createContext, useContext, useState, useCallback } from "react"

interface Toast {
  id: string
  title: string
  description?: string
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  toast: (toast: Omit<Toast, "id">) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback(({ title, description, duration = 5000 }: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { id, title, description, duration }

    setToasts((prev) => [...prev, newToast])

    setTimeout(() => {
      dismiss(id)
    }, duration)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="fixed bottom-0 right-0 z-50 p-4 space-y-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden max-w-sm"
            onClick={() => dismiss(toast.id)}
          >
            <div className="flex p-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200">{toast.title}</p>
                {toast.description && <p className="text-xs text-slate-400 mt-1">{toast.description}</p>}
              </div>
              <button
                className="flex-shrink-0 ml-2 text-slate-400 hover:text-slate-200"
                onClick={() => dismiss(toast.id)}
              >
                <span className="sr-only">Close</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

export const toast = (props: Omit<Toast, "id">) => {
  const { toast } = useToast()
  toast(props)
}
