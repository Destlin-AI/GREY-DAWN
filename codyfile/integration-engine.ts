import { promises as fs } from "fs"
import path from "path"
import { execSync } from "child_process"

export interface IntegrationModule {
  id: string
  name: string
  description: string
  version: string
  dependencies: string[]
  entrypoints: {
    api?: string
    ui?: string
    worker?: string
  }
  capabilities: string[]
}

export class IntegrationEngine {
  private modulesDir: string
  private registryPath: string
  private modules: Map<string, IntegrationModule> = new Map()

  constructor() {
    this.modulesDir = path.join(process.cwd(), "integrations")
    this.registryPath = path.join(this.modulesDir, "registry.json")
  }

  async initialize() {
    // Ensure directories exist
    await fs.mkdir(this.modulesDir, { recursive: true })

    // Load module registry
    try {
      const registry = await fs.readFile(this.registryPath, "utf8")
      const modules = JSON.parse(registry) as IntegrationModule[]
      modules.forEach((m) => this.modules.set(m.id, m))
    } catch (error) {
      // Create empty registry if it doesn't exist
      await fs.writeFile(this.registryPath, JSON.stringify([], null, 2))
    }
  }

  async discoverNewIntegrations(searchQuery: string): Promise<string[]> {
    // This would connect to package registries, GitHub, etc.
    // For now, we'll simulate discovery with LLM assistance
    const response = await fetch("/api/brain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `Find me npm packages or GitHub repositories related to: ${searchQuery}. Format as JSON array of objects with fields: name, description, repoUrl, installCommand`,
        action: "discover",
      }),
    })

    const data = await response.json()
    return data.discoveries || []
  }

  async evaluateIntegration(repoUrl: string): Promise<{
    safe: boolean
    capabilities: string[]
    compatibilityScore: number
    analysisReport: string
  }> {
    // This would analyze the code for security, compatibility, etc.
    // For now, we'll simulate evaluation with LLM assistance
    const response = await fetch("/api/brain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `Analyze this repository for security and compatibility with a Next.js app: ${repoUrl}`,
        action: "evaluate",
      }),
    })

    return await response.json()
  }

  async installIntegration(
    repoUrl: string,
    options: {
      name: string
      autoApprove?: boolean
    },
  ): Promise<IntegrationModule> {
    // Clone repo to temporary location
    const tempDir = path.join(this.modulesDir, "temp", options.name)
    await fs.mkdir(path.dirname(tempDir), { recursive: true })

    try {
      execSync(`git clone ${repoUrl} ${tempDir}`)

      // Generate adapter code with LLM
      const files = await this.recursiveReadDir(tempDir)
      const mainFiles = files
        .filter((f) => f.includes("index.") || f.includes("main.") || f.endsWith(".js") || f.endsWith(".ts"))
        .slice(0, 5) // Limit to 5 files for LLM analysis

      const fileContents = await Promise.all(
        mainFiles.map(async (f) => ({
          path: f,
          content: await fs.readFile(f, "utf8"),
        })),
      )

      const response = await fetch("/api/brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Generate adapter code for integrating this module into a Next.js app. 
                  Files: ${JSON.stringify(fileContents)}`,
          action: "code",
        }),
      })

      const { adapterCode, entrypoints, capabilities } = await response.json()

      // Create the integration module
      const integrationDir = path.join(this.modulesDir, options.name)
      await fs.mkdir(integrationDir, { recursive: true })

      // Move necessary files and write adapter
      await fs.writeFile(path.join(integrationDir, "adapter.ts"), adapterCode)

      // Create module metadata
      const module: IntegrationModule = {
        id: options.name,
        name: options.name,
        description: `Integration for ${options.name}`,
        version: "1.0.0",
        dependencies: [],
        entrypoints,
        capabilities,
      }

      // Update registry
      this.modules.set(module.id, module)
      await this.saveRegistry()

      return module
    } finally {
      // Clean up temp directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true })
      } catch (error) {
        console.error("Failed to clean up temp directory:", error)
      }
    }
  }

  async recursiveReadDir(dir: string): Promise<string[]> {
    const dirents = await fs.readdir(dir, { withFileTypes: true })
    const files = await Promise.all(
      dirents.map((dirent) => {
        const res = path.join(dir, dirent.name)
        return dirent.isDirectory() ? this.recursiveReadDir(res) : [res]
      }),
    )
    return Array.prototype.concat(...files)
  }

  async getModules(): Promise<IntegrationModule[]> {
    return Array.from(this.modules.values())
  }

  private async saveRegistry() {
    await fs.writeFile(this.registryPath, JSON.stringify(Array.from(this.modules.values()), null, 2))
  }
}
export const integrationEngine = new IntegrationEngine()
