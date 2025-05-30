import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export async function GET() {
  try {
    const uploadDir = path.join(process.cwd(), "uploads")

    // Create upload folder if it doesn't exist
    await fs.mkdir(uploadDir, { recursive: true })

    // Get all files in the directory
    const files = await fs.readdir(uploadDir)

    // Read the content of each file
    const fileContents = await Promise.all(
      files.map(async (filename) => {
        const filePath = path.join(uploadDir, filename)
        const stats = await fs.stat(filePath)
        const content = await fs.readFile(filePath, "utf8")

        // Determine file type based on extension
        const extension = path.extname(filename).toLowerCase()
        let type = "text/plain"

        // Map common extensions to MIME types
        const mimeTypes: Record<string, string> = {
          ".js": "application/javascript",
          ".jsx": "application/javascript",
          ".ts": "application/typescript",
          ".tsx": "application/typescript",
          ".json": "application/json",
          ".html": "text/html",
          ".css": "text/css",
          ".py": "text/x-python",
          ".md": "text/markdown",
          ".yml": "application/yaml",
          ".yaml": "application/yaml",
          ".csv": "text/csv",
          ".xml": "application/xml",
        }

        if (extension in mimeTypes) {
          type = mimeTypes[extension]
        }

        return {
          name: filename,
          type,
          content,
          uploadedAt: stats.mtime.toISOString(),
          size: stats.size,
        }
      }),
    )

    return NextResponse.json(fileContents)
  } catch (error) {
    console.error("Error listing files:", error)
    return NextResponse.json({ error: "Failed to list files" }, { status: 500 })
  }
}
