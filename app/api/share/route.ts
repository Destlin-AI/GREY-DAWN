import { NextResponse } from "next/server"
import { createSharedFile, getSharedFiles } from "@/lib/share-service"

// Create a new shared file
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { originalFilename, expiresAt, isPasswordProtected, password } = body

    // In a real app, we would get the user from the session
    // For now, we'll use a mock user
    const user = { name: "Admin User", email: "admin@nexus.com" }

    const sharedFile = await createSharedFile({
      originalFilename,
      expiresAt,
      isPasswordProtected: !!isPasswordProtected,
      password: isPasswordProtected ? password : undefined,
      createdBy: user.email,
    })

    // Remove password from response
    const { password: _, ...safeSharedFile } = sharedFile

    return NextResponse.json(safeSharedFile, { status: 201 })
  } catch (error) {
    console.error("Error creating shared file:", error)
    return NextResponse.json({ error: "Failed to create shared file" }, { status: 500 })
  }
}

// Get all shared files
export async function GET() {
  try {
    const sharedFiles = await getSharedFiles()

    // Remove passwords from response
    const safeSharedFiles = sharedFiles.map(({ password, ...file }) => file)

    return NextResponse.json(safeSharedFiles)
  } catch (error) {
    console.error("Error fetching shared files:", error)
    return NextResponse.json({ error: "Failed to fetch shared files" }, { status: 500 })
  }
}
