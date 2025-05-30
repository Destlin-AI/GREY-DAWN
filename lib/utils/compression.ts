import pako from "pako"

/**
 * Compresses data using gzip
 * @param data - The data to compress
 * @returns Compressed data as Uint8Array
 */
export function compressData(data: string | Uint8Array): Uint8Array {
  const input = typeof data === "string" ? new TextEncoder().encode(data) : data
  return pako.gzip(input)
}

/**
 * Decompresses gzipped data
 * @param data - The compressed data
 * @returns Decompressed data as Uint8Array
 */
export function decompressData(data: Uint8Array): Uint8Array {
  return pako.ungzip(data)
}

/**
 * Compresses data and encodes it as base64
 * @param data - The data to compress
 * @returns Compressed data as base64 string
 */
export function compressToBase64(data: string | Uint8Array): string {
  const compressed = compressData(data)
  return btoa(String.fromCharCode.apply(null, Array.from(compressed)))
}

/**
 * Decodes base64 and decompresses data
 * @param base64 - The base64 encoded compressed data
 * @returns Decompressed data as string
 */
export function decompressFromBase64(base64: string): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  const decompressed = decompressData(bytes)
  return new TextDecoder().decode(decompressed)
}

/**
 * Browser-compatible zlib replacement
 * This provides a subset of zlib functionality that works in browsers
 */
export const browserZlib = {
  gzip: compressData,
  gunzip: decompressData,
  gzipSync: compressData,
  gunzipSync: decompressData,
}
