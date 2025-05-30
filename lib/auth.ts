// Authentication types and utilities
export interface User {
  id: string
  name: string
  email: string
  role: "admin" | "user" | "guest"
  avatar?: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

// Mock user data - in a real app, this would come from a database
export const MOCK_USERS: User[] = [
  {
    id: "user-1",
    name: "Admin User",
    email: "admin@nexus.com",
    role: "admin",
    avatar: "/abstract-admin-interface.png",
  },
  {
    id: "user-2",
    name: "Test User",
    email: "user@nexus.com",
    role: "user",
    avatar: "/vibrant-street-market.png",
  },
]

// Simple token generation
export function generateToken(length = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let token = ""
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

export const authOptions = {}
