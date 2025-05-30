import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Logger utility for consistent logging throughout the application
 * Inspired by Python's logging module
 */
export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[GRAVEMIND:INFO] ${message}`, ...args)
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[GRAVEMIND:WARN] ${message}`, ...args)
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[GRAVEMIND:ERROR] ${message}`, ...args)
  },
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug(`[GRAVEMIND:DEBUG] ${message}`, ...args)
    }
  },
  // Specialized logging for tensor operations
  tensor: (message: string, ...args: any[]) => {
    console.log(`[GRAVEMIND:TENSOR] ${message}`, ...args)
  },
  // GPU-specific logging
  gpu: (message: string, ...args: any[]) => {
    console.log(`[GRAVEMIND:GPU] ${message}`, ...args)
  },
  // NVME storage logging
  nvme: (message: string, ...args: any[]) => {
    console.log(`[GRAVEMIND:NVME] ${message}`, ...args)
  },
  // Performance logging
  performance: (message: string, ...args: any[]) => {
    console.log(`[GRAVEMIND:PERF] ${message}`, ...args)
  },
}

/**
 * Safely handle errors with proper logging
 */
export function safelyHandleError(error: any, context = "unknown") {
  logger.error(`Error in ${context}: ${error?.message || "Unknown error"}`)
  if (error?.stack) {
    logger.debug(`Stack trace: ${error.stack}`)
  }
  return null
}

/**
 * Dynamically import a module
 */
export async function dynamicImport(modulePath: string) {
  try {
    return await import(modulePath)
  } catch (error) {
    logger.error(`Failed to import module: ${modulePath}`)
    throw error
  }
}
