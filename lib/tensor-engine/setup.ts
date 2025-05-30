/**
 * Setup script for the tensor engine
 * This script copies the Python files to the right location
 */

import fs from "fs"
import path from "path"
import { logger } from "../utils"

export async function setupTensorEngine() {
  try {
    const enginePath = process.env.TENSOR_SCRIPTS_PATH || path.join(process.cwd(), "lib", "tensor-engine", "scripts")

    // Create directory if it doesn't exist
    if (!fs.existsSync(enginePath)) {
      fs.mkdirSync(enginePath, { recursive: true })
    }

    // Copy Python files
    const sourceDir = path.join(process.cwd(), "tensor-scripts")
    if (!fs.existsSync(sourceDir)) {
      logger.warn(`Source directory ${sourceDir} not found, creating it`)
      fs.mkdirSync(sourceDir, { recursive: true })

      // Create a README file
      fs.writeFileSync(
        path.join(sourceDir, "README.md"),
        `# Tensor Engine Scripts

This directory should contain the following Python scripts:
- tensor_server_nvme.py
- adaptive_tensor_server.py
- tensor_enhancements.py
- auto_allocation.py

Please copy your tensor scripts here, and they will be automatically used by the tensor engine.
`,
      )

      return false
    }

    // Copy all Python files
    const files = fs.readdirSync(sourceDir)
    let copied = 0

    for (const file of files) {
      if (file.endsWith(".py")) {
        const sourcePath = path.join(sourceDir, file)
        const destPath = path.join(enginePath, file)

        fs.copyFileSync(sourcePath, destPath)
        logger.info(`Copied ${file} to ${enginePath}`)
        copied++
      }
    }

    if (copied === 0) {
      logger.warn("No Python files found to copy")
      return false
    }

    logger.info(`Copied ${copied} Python files to ${enginePath}`)
    return true
  } catch (error) {
    logger.error(`Failed to setup tensor engine: ${error}`)
    return false
  }
}
