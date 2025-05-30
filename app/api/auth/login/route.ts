import { NextResponse } from "next/server"
import { MOCK_USERS, generateToken } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    // In a real app, you would validate credentials against a database
    // and use proper password hashing
    const user = MOCK_USERS.find((u) => u.email === email)

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // For demo purposes, we accept any password for the mock users
    // In a real app, you would verify the password hash

    // Generate a token
    const token = generateToken()

    // In a real app, you would store this token in a database
    // associated with the user, with an expiration time

    // Return the user and token
    return NextResponse.json({
      user,
      token,
    })
  } catch (error) {
    console.error("Authentication error:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}
