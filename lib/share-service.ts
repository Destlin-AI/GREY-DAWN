import { promises as fs } from "fs"
import path from "path"
import { v4 as uuidv4 } from "uuid"

export interface SharedFile {
  id: string
  originalFilename: string
  shareUrl: string
  createdAt: string
  expiresAt?: string
  accessCount: number
  isPasswordProtected: boolean
  password?: string
  createdBy: string
}

const SHARE_DB_PATH = path.join(process.cwd(), "data")
const SHARE_DB_FILE = path.join(SHARE_DB_PATH, "shared-files.json")

// Initialize the shared files database
async function initShareDb() {
  try {
    await fs.mkdir(SHARE_DB_PATH, { recursive: true })

    try {
      await fs.access(SHARE_DB_FILE)
    } catch (error) {
      // File doesn't exist, create it
      await fs.writeFile(SHARE_DB_FILE, JSON.stringify([]), "utf8")
    }
  } catch (error) {
    console.error("Error initializing share database:", error)
    throw error
  }
}

// Get all shared files
export async function getSharedFiles(): Promise<SharedFile[]> {
  await initShareDb()

  try {
    const data = await fs.readFile(SHARE_DB_FILE, "utf8")
    return JSON.parse(data)
  } catch (error) {
    console.error("Error reading shared files:", error)
    return []
  }
}

// Get a shared file by ID
export async function getSharedFileById(id: string): Promise<SharedFile | null> {
  const sharedFiles = await getSharedFiles()
  return sharedFiles.find((file) => file.id === id) || null
}

// Create a new shared file
export async function createSharedFile(
  data: Omit<SharedFile, "id" | "createdAt" | "accessCount" | "shareUrl">,
): Promise<SharedFile> {
  await initShareDb()

  const sharedFiles = await getSharedFiles()

  const id = uuidv4()
  const shareUrl = `/shared/${id}`

  const newSharedFile: SharedFile = {
    id,
    shareUrl,
    createdAt: new Date().toISOString(),
    accessCount: 0,
    ...data,
  }

  sharedFiles.push(newSharedFile)

  await fs.writeFile(SHARE_DB_FILE, JSON.stringify(sharedFiles, null, 2), "utf8")

  return newSharedFile
}

// Update a shared file
export async function updateSharedFile(id: string, data: Partial<Omit<SharedFile, "id">>): Promise<SharedFile | null> {
  await initShareDb()

  const sharedFiles = await getSharedFiles()
  const fileIndex = sharedFiles.findIndex((file) => file.id === id)

  if (fileIndex === -1) {
    return null
  }

  const updatedFile = {
    ...sharedFiles[fileIndex],
    ...data,
  }

  sharedFiles[fileIndex] = updatedFile

  await fs.writeFile(SHARE_DB_FILE, JSON.stringify(sharedFiles, null, 2), "utf8")

  return updatedFile
}

// Delete a shared file
export async function deleteSharedFile(id: string): Promise<boolean> {
  await initShareDb()

  const sharedFiles = await getSharedFiles()
  const fileIndex = sharedFiles.findIndex((file) => file.id === id)

  if (fileIndex === -1) {
    return false
  }

  sharedFiles.splice(fileIndex, 1)

  await fs.writeFile(SHARE_DB_FILE, JSON.stringify(sharedFiles, null, 2), "utf8")

  return true
}

// Increment access count for a shared file
export async function incrementAccessCount(id: string): Promise<void> {
  await initShareDb()

  const sharedFiles = await getSharedFiles()
  const fileIndex = sharedFiles.findIndex((file) => file.id === id)

  if (fileIndex !== -1) {
    sharedFiles[fileIndex].accessCount += 1
    await fs.writeFile(SHARE_DB_FILE, JSON.stringify(sharedFiles, null, 2), "utf8")
  }
}

// Check if a shared file is expired
export function isExpired(file: SharedFile): boolean {
  if (!file.expiresAt) {
    return false
  }

  const expiryDate = new Date(file.expiresAt)
  const currentDate = new Date()

  return currentDate > expiryDate
}
