"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { AuthState } from "@/lib/auth"

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  })
  const router = useRouter()

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if we're in a browser environment before accessing localStorage
        const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null

        if (!token) {
          setState({ user: null, isAuthenticated: false, isLoading: false })
          return
        }

        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setState({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
          })
        } else {
          // Token is invalid
          if (typeof window !== "undefined") {
            localStorage.removeItem("auth_token")
          }
          setState({ user: null, isAuthenticated: false, isLoading: false })
        }
      } catch (error) {
        console.error("Auth check failed:", error)
        setState({ user: null, isAuthenticated: false, isLoading: false })
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Login failed")
      }

      // Save token to localStorage (only in browser)
      if (typeof window !== "undefined") {
        localStorage.setItem("auth_token", data.token)
      }

      // Update state
      setState({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      })

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error) {
      console.error("Login failed:", error)
      throw error
    }
  }

  const logout = () => {
    // Remove token from localStorage
    localStorage.removeItem("auth_token")

    // Update state
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })

    // Redirect to login
    router.push("/login")
  }

  return <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context
}
