import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export async function POST(req: Request) {
  try {
    const { filename, content } = await req.json()

    if (!filename || !content) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const uploadDir = path.join(process.cwd(), "uploads")

    // Create upload folder if it doesn't exist
    await fs.mkdir(uploadDir, { recursive: true })

    const filePath = path.join(uploadDir, filename)

    await fs.writeFile(filePath, content, "utf8")

    return NextResponse.json({ success: true, path: filePath })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
