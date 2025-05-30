import { NextResponse } from "next/server"
import type { StorageInfo } from "@/lib/api"

export async function GET() {
  try {
    // Mock data for storage
    const storage: StorageInfo[] = [
      {
        name: "System Drive (C:)",
        total: 512,
        used: 324,
        type: "SSD",
      },
      {
        name: "Data Drive (D:)",
        total: 2048,
        used: 1285,
        type: "HDD",
      },
      {
        name: "Backup Drive (E:)",
        total: 4096,
        used: 1865,
        type: "HDD",
      },
      {
        name: "External Drive (F:)",
        total: 1024,
        used: 210,
        type: "SSD",
      },
    ]

    return NextResponse.json(storage)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch storage information" }, { status: 500 })
  }
}
