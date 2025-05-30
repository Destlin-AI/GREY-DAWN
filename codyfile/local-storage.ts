import fs from "fs"
import path from "path"
import { getPortableConfig } from "./portable-config"

export class LocalStorage {
  private basePath: string

  constructor() {
    const config = getPortableConfig()
    this.basePath = config.dataPath

    // Ensure the directory exists
    fs.mkdirSync(this.basePath, { recursive: true })
  }

  async save(key: string, data: any): Promise<void> {
    const filePath = path.join(this.basePath, `${key}.json`)
    await fs.promises.writeFile(filePath, JSON.stringify(data), "utf8")
  }

  async load(key: string): Promise<any> {
    const filePath = path.join(this.basePath, `${key}.json`)
    try {
      const data = await fs.promises.readFile(filePath, "utf8")
      return JSON.parse(data)
    } catch (error) {
      return null
    }
  }
}

// Singleton instance
export const localStorage = new LocalStorage()
