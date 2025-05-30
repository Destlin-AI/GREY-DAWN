import { NextResponse } from "next/server"
import { MOCK_USERS } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    // In a real app, you would verify the token from the Authorization header
    // and fetch the user from the database
    const authHeader = request.headers.get("Authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // For demo purposes, we'll just return the first user
    // In a real app, you would decode the token and fetch the correct user
    const user = MOCK_USERS[0]

    return NextResponse.json({ user })
  } catch (error) {
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}
