/**
 * Browser-compatible hardware detection utilities
 */

// GPU detection
export async function detectGPU() {
  if (typeof window === "undefined") {
    return { available: false, name: "Unknown", memory: 0 }
  }

  try {
    const canvas = document.createElement("canvas")
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl")

    if (!gl) {
      return { available: false, name: "No WebGL support", memory: 0 }
    }

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info")
    if (!debugInfo) {
      return { available: false, name: "No debug info available", memory: 0 }
    }

    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)

    // Try to determine if it's a dedicated GPU
    const isLikelyGPU = /nvidia|amd|radeon|geforce|intel/i.test(renderer) && !/intel(r) hd graphics/i.test(renderer)

    // Estimate VRAM based on renderer name
    let estimatedVRAM = 2 // Default 2GB
    if (/rtx/i.test(renderer)) {
      if (/4090|3090/i.test(renderer)) estimatedVRAM = 24
      else if (/4080|3080/i.test(renderer)) estimatedVRAM = 16
      else if (/4070|3070/i.test(renderer)) estimatedVRAM = 12
      else if (/4060|3060/i.test(renderer)) estimatedVRAM = 8
    } else if (/gtx/i.test(renderer)) {
      if (/1080/i.test(renderer)) estimatedVRAM = 8
      else if (/1070/i.test(renderer)) estimatedVRAM = 8
      else if (/1060/i.test(renderer)) estimatedVRAM = 6
    } else if (/radeon/i.test(renderer)) {
      if (/rx 6/i.test(renderer)) estimatedVRAM = 12
      else if (/rx 5/i.test(renderer)) estimatedVRAM = 8
    }

    // Try to get more accurate GPU info using WebGPU if available
    if (typeof navigator !== "undefined" && "gpu" in navigator) {
      try {
        // @ts-ignore - WebGPU might not be in all TypeScript definitions yet
        const adapter = await navigator.gpu.requestAdapter()
        if (adapter) {
          // @ts-ignore
          const info = await adapter.requestAdapterInfo()
          if (info && info.device) {
            return {
              available: true,
              name: info.device,
              vendor: info.vendor || vendor,
              memory: estimatedVRAM * 1024 * 1024 * 1024, // Convert to bytes
            }
          }
        }
      } catch (e) {
        console.log("WebGPU detection failed, falling back to WebGL detection")
        // Continue with WebGL detection
      }
    }

    return {
      available: isLikelyGPU,
      name: renderer,
      vendor,
      memory: estimatedVRAM * 1024 * 1024 * 1024, // Convert to bytes
    }
  } catch (e) {
    console.error("Error detecting GPU:", e)
    return { available: false, name: "Detection failed", memory: 0 }
  }
}

// CPU detection
export function detectCPU() {
  try {
    const threads = navigator?.hardwareConcurrency || 4

    // Estimate cores (usually half of threads)
    const estimatedCores = Math.max(1, Math.floor(threads / 2))

    // Try to detect CPU model and speed
    let cpuModel = "Unknown CPU"

    // Some browsers expose CPU info in user agent
    if (navigator && navigator.userAgent) {
      const uaMatch = navigator.userAgent.match(/$$([^)]+)$$/)
      if (uaMatch && uaMatch[1]) {
        const uaParts = uaMatch[1].split(";")
        for (const part of uaParts) {
          if (part.includes("CPU") || part.includes("Intel") || part.includes("AMD")) {
            cpuModel = part.trim()
            break
          }
        }
      }
    }

    return {
      threads,
      cores: estimatedCores,
      model: cpuModel,
    }
  } catch (e) {
    console.error("Error detecting CPU:", e)
    return {
      threads: 4,
      cores: 2,
      model: "Unknown CPU",
    }
  }
}

// Memory detection
export function detectMemory() {
  try {
    // We can't accurately detect total system RAM in browser
    // We'll use performance.memory if available, otherwise estimate
    if (typeof performance !== "undefined" && (performance as any).memory) {
      const memoryInfo = (performance as any).memory
      return {
        total: memoryInfo.jsHeapSizeLimit,
        used: memoryInfo.usedJSHeapSize,
        limit: memoryInfo.totalJSHeapSize,
      }
    }

    // Fallback to estimation based on navigator.deviceMemory if available
    if (navigator && (navigator as any).deviceMemory) {
      const deviceMemory = (navigator as any).deviceMemory
      return {
        total: deviceMemory * 1024 * 1024 * 1024,
        used: 0,
        limit: deviceMemory * 1024 * 1024 * 1024,
      }
    }

    // Last resort fallback - try to estimate based on platform
    let estimatedRAM = 8 // Default 8GB

    if (typeof navigator !== "undefined") {
      const platform = navigator.platform || ""
      const userAgent = navigator.userAgent || ""

      // Higher estimates for desktop platforms
      if (platform.includes("Win") || platform.includes("Mac") || platform.includes("Linux")) {
        estimatedRAM = 16 // Assume 16GB for desktop

        // Adjust based on likely high-end systems
        if (userAgent.includes("Gaming") || userAgent.includes("Workstation")) {
          estimatedRAM = 32
        }
      }
      // Lower estimates for mobile
      else if (platform.includes("iPhone") || platform.includes("iPad") || userAgent.includes("Android")) {
        estimatedRAM = 4 // Assume 4GB for mobile
      }
    }

    return {
      total: estimatedRAM * 1024 * 1024 * 1024, // Convert to bytes
      used: 0,
      limit: estimatedRAM * 1024 * 1024 * 1024,
    }
  } catch (e) {
    console.error("Error detecting memory:", e)
    return {
      total: 8 * 1024 * 1024 * 1024, // Assume 8GB
      used: 0,
      limit: 8 * 1024 * 1024 * 1024,
    }
  }
}

// Storage detection
export async function detectStorage() {
  try {
    if (typeof navigator === "undefined" || !("storage" in navigator)) {
      return {
        available: true,
        total: 500 * 1024 * 1024 * 1024, // Assume 500GB
        free: 250 * 1024 * 1024 * 1024, // Assume 250GB free
      }
    }

    // Try to use the Storage API if available
    // @ts-ignore - Storage API might not be in all TypeScript definitions
    const estimate = await navigator.storage.estimate()
    if (estimate && estimate.quota) {
      return {
        available: true,
        total: estimate.quota,
        free: estimate.quota - (estimate.usage || 0),
      }
    }

    // Fallback to estimation
    return {
      available: true,
      total: 500 * 1024 * 1024 * 1024, // Assume 500GB
      free: 250 * 1024 * 1024 * 1024, // Assume 250GB free
    }
  } catch (e) {
    console.error("Error detecting storage:", e)
    return {
      available: true,
      total: 500 * 1024 * 1024 * 1024, // Assume 500GB
      free: 250 * 1024 * 1024 * 1024, // Assume 250GB free
    }
  }
}
