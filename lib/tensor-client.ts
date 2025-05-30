/**
 * Client for interacting with the tensor server
 */

class TensorClient {
  private baseUrl: string

  constructor(baseUrl = "http://localhost:8000") {
    this.baseUrl = baseUrl
  }

  /**
   * Get server status
   */
  async getStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/status`)
      if (!response.ok) {
        throw new Error(`Failed to get status: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      console.error("Error getting tensor server status:", error)
      throw error
    }
  }

  /**
   * Get layer information
   */
  async getLayers(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/layers`)
      if (!response.ok) {
        throw new Error(`Failed to get layers: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      console.error("Error getting layer information:", error)
      throw error
    }
  }

  /**
   * Generate text completion
   */
  async generateCompletion(prompt: string, options: any = {}): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          max_tokens: options.maxTokens || 1024,
          temperature: options.temperature || 0.7,
          top_p: options.topP || 0.9,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to generate completion: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error generating completion:", error)
      throw error
    }
  }

  /**
   * Optimize layer allocation
   */
  async optimizeLayers(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/optimize_layers`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error(`Failed to optimize layers: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error optimizing layers:", error)
      throw error
    }
  }

  /**
   * Get NVME health information
   */
  async getNvmeHealth(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/nvme_health`)
      if (!response.ok) {
        throw new Error(`Failed to get NVME health: ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      console.error("Error getting NVME health:", error)
      throw error
    }
  }
}

export const tensorClient = new TensorClient()
export default TensorClient
