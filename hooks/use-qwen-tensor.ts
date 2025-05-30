"use client"

import { useState, useEffect, useCallback } from "react"
import { getQwenTensorEngine } from "@/lib/tensor-system/qwen-tensor-engine"
import { getContextOptimizer } from "@/lib/tensor-system/context-optimizer"

export function useQwenTensor() {
  const [isRunning, setIsRunning] = useState(false)
  const [model, setModel] = useState(null)
  const [hardware, setHardware] = useState(null)
  const [allocation, setAllocation] = useState(null)
  const [context, setContext] = useState({
    currentLength: 0,
    maxLength: 0,
    percentUsed: 0,
    useNVMEExtension: false,
    nvmeStatus: null,
  })
  const [error, setError] = useState("")

  const qwenTensorEngine = getQwenTensorEngine()
  const contextOptimizer = getContextOptimizer()

  // Initialize event listeners
  useEffect(() => {
    const handleStarted = (data: any) => {
      setIsRunning(true)
      setModel(data.model)
      setAllocation(data.allocation)
    }

    const handleStopped = () => {
      setIsRunning(false)
    }

    const handleError = (data: any) => {
      setError(data.message)
    }

    const handleHardwareDetected = (data: any) => {
      setHardware(data)
    }

    const handleAllocationUpdated = (data: any) => {
      setAllocation(data)
    }

    const handleContextProgress = (data: any) => {
      setContext((prev) => ({
        ...prev,
        currentLength: data.currentLength,
        maxLength: data.maxLength,
        percentUsed: data.percentUsed,
      }))
    }

    const handleContextInitialized = (data: any) => {
      setContext((prev) => ({
        ...prev,
        maxLength: data.maxContextLength,
        useNVMEExtension: data.useNVMEExtension,
      }))
    }

    // Add event listeners
    qwenTensorEngine.on("started", handleStarted)
    qwenTensorEngine.on("stopped", handleStopped)
    qwenTensorEngine.on("error", handleError)
    qwenTensorEngine.on("hardware-detected", handleHardwareDetected)
    qwenTensorEngine.on("allocation-updated", handleAllocationUpdated)
    contextOptimizer.on("progress", handleContextProgress)
    contextOptimizer.on("initialized", handleContextInitialized)

    // Get initial status
    const status = qwenTensorEngine.getStatus()
    setIsRunning(status.isRunning)
    setModel(status.model)
    setHardware(status.hardware)
    setAllocation(status.allocation)

    const contextStatus = contextOptimizer.getStatus()
    setContext({
      currentLength: contextStatus.currentLength,
      maxLength: contextStatus.maxLength,
      percentUsed: (contextStatus.currentLength / contextStatus.maxLength) * 100,
      useNVMEExtension: contextStatus.useNVMEExtension,
      nvmeStatus: contextStatus.nvmeStatus,
    })

    // Cleanup
    return () => {
      qwenTensorEngine.off("started", handleStarted)
      qwenTensorEngine.off("stopped", handleStopped)
      qwenTensorEngine.off("error", handleError)
      qwenTensorEngine.off("hardware-detected", handleHardwareDetected)
      qwenTensorEngine.off("allocation-updated", handleAllocationUpdated)
      contextOptimizer.off("progress", handleContextProgress)
      contextOptimizer.off("initialized", handleContextInitialized)
    }
  }, [qwenTensorEngine, contextOptimizer])

  // Start the engine
  const startEngine = useCallback(
    async (modelPath: string) => {
      try {
        setError("")
        return await qwenTensorEngine.start(modelPath)
      } catch (err: any) {
        setError(err.message)
        return false
      }
    },
    [qwenTensorEngine],
  )

  // Stop the engine
  const stopEngine = useCallback(async () => {
    try {
      setError("")
      return await qwenTensorEngine.stop()
    } catch (err: any) {
      setError(err.message)
      return false
    }
  }, [qwenTensorEngine])

  // Set NVME path
  const setNvmePath = useCallback(
    (path: string) => {
      try {
        qwenTensorEngine.setNvmePath(path)
        contextOptimizer.setNVMEPath(path)
      } catch (err: any) {
        setError(err.message)
      }
    },
    [qwenTensorEngine, contextOptimizer],
  )

  // Set whether to use NVME for extended context
  const setUseNVMEContext = useCallback((useNVME: boolean) => {
    try {
      // In a real implementation, this would update the context optimizer configuration
      setContext((prev) => ({
        ...prev,
        useNVMEExtension: useNVME,
      }))
    } catch (err: any) {
      setError(err.message)
    }
  }, [])

  return {
    isRunning,
    model,
    hardware,
    allocation,
    context,
    error,
    startEngine,
    stopEngine,
    setNvmePath,
    setUseNVMEContext,
  }
}
