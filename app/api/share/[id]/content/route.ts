import { NextResponse } from "next/server"
import { getSharedFileById, incrementAccessCount, isExpired } from "@/lib/share-service"
import { promises as fs } from "fs"
import path from "path"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const sharedFile = await getSharedFileById(id)

    if (!sharedFile) {
      return NextResponse.json({ error: "Shared file not found" }, { status: 404 })
    }

    // Check if the file is expired
    if (isExpired(sharedFile)) {
      return NextResponse.json({ error: "This shared link has expired" }, { status: 410 })
    }

    // Check if password is required
    if (sharedFile.isPasswordProtected) {
      const url = new URL(request.url)
      const password = url.searchParams.get("password")

      if (!password || password !== sharedFile.password) {
        return NextResponse.json({ error: "Password required or incorrect" }, { status: 401 })
      }
    }

    // Get the file content
    const uploadDir = path.join(process.cwd(), "uploads")
    const filePath = path.join(uploadDir, sharedFile.originalFilename)

    try {
      const content = await fs.readFile(filePath, "utf8")

      // Increment access count
      await incrementAccessCount(id)

      return NextResponse.json({ content, filename: sharedFile.originalFilename })
    } catch (error) {
      console.error("Error reading file:", error)
      return NextResponse.json({ error: "File not found or inaccessible" }, { status: 404 })
    }
  } catch (error) {
    console.error("Error accessing shared file:", error)
    return NextResponse.json({ error: "Failed to access shared file" }, { status: 500 })
  }
}
