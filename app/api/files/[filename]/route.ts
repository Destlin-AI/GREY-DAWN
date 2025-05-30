import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export async function DELETE(request: Request, { params }: { params: { filename: string } }) {
  try {
    const filename = decodeURIComponent(params.filename)
    const uploadDir = path.join(process.cwd(), "uploads")
    const filePath = path.join(uploadDir, filename)

    // Check if file exists
    try {
      await fs.access(filePath)
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Delete the file
    await fs.unlink(filePath)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting file:", error)
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 })
  }
}
