import { NextResponse } from "next/server"
import type { ProcessInfo } from "@/lib/api"

export async function GET() {
  try {
    // Mock data for processes
    const processes: ProcessInfo[] = [
      {
        pid: "1024",
        name: "system_core.exe",
        user: "SYSTEM",
        cpu: 12.4,
        memory: 345,
        status: "running",
      },
      {
        pid: "1842",
        name: "nexus_service.exe",
        user: "SYSTEM",
        cpu: 8.7,
        memory: 128,
        status: "running",
      },
      {
        pid: "2156",
        name: "security_monitor.exe",
        user: "ADMIN",
        cpu: 5.2,
        memory: 96,
        status: "running",
      },
      {
        pid: "3012",
        name: "network_manager.exe",
        user: "SYSTEM",
        cpu: 3.8,
        memory: 84,
        status: "running",
      },
      {
        pid: "4268",
        name: "user_interface.exe",
        user: "USER",
        cpu: 15.3,
        memory: 256,
        status: "running",
      },
      {
        pid: "5124",
        name: "data_analyzer.exe",
        user: "ADMIN",
        cpu: 22.1,
        memory: 512,
        status: "running",
      },
    ]

    return NextResponse.json(processes)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch processes" }, { status: 500 })
  }
}
