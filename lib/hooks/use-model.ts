"use client"

import { useState, useEffect, useCallback } from "react"
import { tensorAPI, type ModelStatus } from "@/lib/api/tensor-api-client"

/**
 * Hook for managing tensor model operations
 * @returns Object containing model status, loading state, error state, and model management functions
 */
export function useModel() {
  const [model, setModel] = useState<ModelStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchModelStatus = useCallback(async () => {
    try {
      const modelStatus = await tensorAPI.getModelStatus()
      setModel(modelStatus)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch model status")
    }
  }, [])

  const loadModel = useCallback(async (modelPath: string, computeDevice?: string, hfToken?: string) => {
    try {
      setLoading(true)
      setError(null)
      const result = await tensorAPI.loadModel({
        model_name_or_path: modelPath,
        compute_device: computeDevice,
        hf_token: hfToken,
      })
      setModel(result)
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load model"
      setError(errorMsg)
      throw new Error(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [])

  const unloadModel = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await tensorAPI.unloadModel()
      setModel(result)
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to unload model"
      setError(errorMsg)
      throw new Error(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [])

  const generateText = useCallback(
    async (prompt: string, maxTokens = 128, temperature = 0.7, topP = 0.9, topK?: number) => {
      try {
        const result = await tensorAPI.generateText({
          prompt,
          max_new_tokens: maxTokens,
          temperature,
          top_p: topP,
          top_k: topK,
        })
        return result
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : "Failed to generate text")
      }
    },
    [],
  )

  useEffect(() => {
    fetchModelStatus()
  }, [fetchModelStatus])

  return {
    model,
    loading,
    error,
    loadModel,
    unloadModel,
    generateText,
    refetch: fetchModelStatus,
  }
}
