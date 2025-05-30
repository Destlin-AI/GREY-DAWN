import { NextResponse } from "next/server"
import { resolve, dirname } from "path"
import Database from "better-sqlite3"
import fs from "fs"

// Path to the database
const DB_PATH = resolve(process.cwd(), "data/Database/nexus.db")

// Initialize database connection
let db: any

try {
  // Ensure the directory exists
  const dbDir = dirname(DB_PATH)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
    console.log(`Created database directory: ${dbDir}`)
  }

  db = new Database(DB_PATH, { fileMustExist: false })
  console.log(`Successfully connected to database at: ${DB_PATH}`)

  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT DEFAULT 'inactive',
      last_run TIMESTAMP,
      features TEXT
    );
  `)
} catch (error) {
  console.error("Database initialization error:", error)
  // Don't throw the error, just log it - we'll handle the null db case in the route handlers
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const table = url.searchParams.get("table")

    if (!db) {
      console.error("Database not initialized when handling GET request")
      return NextResponse.json({ error: "Database not initialized. Check server logs for details." }, { status: 500 })
    }

    if (!table) {
      return NextResponse.json({ error: "Table parameter required" }, { status: 400 })
    }

    // Validate table name to prevent SQL injection
    if (!["files", "agents"].includes(table)) {
      return NextResponse.json({ error: "Invalid table" }, { status: 400 })
    }

    const rows = db.prepare(`SELECT * FROM ${table}`).all()

    return NextResponse.json({ data: rows })
  } catch (error) {
    console.error("Database query error:", error)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { table, action, data } = body

    if (!db) {
      console.error("Database not initialized when handling POST request")
      return NextResponse.json({ error: "Database not initialized. Check server logs for details." }, { status: 500 })
    }

    if (!table || !action) {
      return NextResponse.json({ error: "Table and action parameters required" }, { status: 400 })
    }

    // Validate table name to prevent SQL injection
    if (!["files", "agents"].includes(table)) {
      return NextResponse.json({ error: "Invalid table" }, { status: 400 })
    }

    let result

    // Handle different actions
    switch (action) {
      case "insert":
        if (table === "files") {
          const { id, name, content, type } = data
          result = db
            .prepare(`
            INSERT INTO files (id, name, content, type) 
            VALUES (?, ?, ?, ?)
          `)
            .run(id, name, content, type)
        } else if (table === "agents") {
          const { id, name, category, status, features } = data
          result = db
            .prepare(`
            INSERT INTO agents (id, name, category, status, features) 
            VALUES (?, ?, ?, ?, ?)
          `)
            .run(id, name, category, status, JSON.stringify(features))
        }
        break

      case "update":
        if (table === "files") {
          const { id, name, content, type } = data
          result = db
            .prepare(`
            UPDATE files 
            SET name = ?, content = ?, type = ? 
            WHERE id = ?
          `)
            .run(name, content, type, id)
        } else if (table === "agents") {
          const { id, name, category, status, features } = data
          result = db
            .prepare(`
            UPDATE agents 
            SET name = ?, category = ?, status = ?, features = ? 
            WHERE id = ?
          `)
            .run(name, category, status, JSON.stringify(features), id)
        }
        break

      case "delete":
        const { id } = data
        result = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id)
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error("Database operation error:", error)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }
}
