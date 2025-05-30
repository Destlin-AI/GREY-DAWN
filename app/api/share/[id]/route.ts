import { NextResponse } from "next/server"
import { getSharedFileById, updateSharedFile, deleteSharedFile } from "@/lib/share-service"

// Get a specific shared file
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const sharedFile = await getSharedFileById(id)

    if (!sharedFile) {
      return NextResponse.json({ error: "Shared file not found" }, { status: 404 })
    }

    // Remove password from response
    const { password, ...safeSharedFile } = sharedFile

    return NextResponse.json(safeSharedFile)
  } catch (error) {
    console.error("Error fetching shared file:", error)
    return NextResponse.json({ error: "Failed to fetch shared file" }, { status: 500 })
  }
}

// Update a shared file
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const body = await request.json()

    const updatedFile = await updateSharedFile(id, body)

    if (!updatedFile) {
      return NextResponse.json({ error: "Shared file not found" }, { status: 404 })
    }

    // Remove password from response
    const { password, ...safeSharedFile } = updatedFile

    return NextResponse.json(safeSharedFile)
  } catch (error) {
    console.error("Error updating shared file:", error)
    return NextResponse.json({ error: "Failed to update shared file" }, { status: 500 })
  }
}

// Delete a shared file
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const success = await deleteSharedFile(id)

    if (!success) {
      return NextResponse.json({ error: "Shared file not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting shared file:", error)
    return NextResponse.json({ error: "Failed to delete shared file" }, { status: 500 })
  }
}
