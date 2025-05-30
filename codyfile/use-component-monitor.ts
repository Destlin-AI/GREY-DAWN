"use client"

import { useEffect, useRef } from "react"
import { monitorIntegrator } from "@/lib/monitor-integrator"

export function useComponentMonitor(
  componentId: string,
  initialMetrics: Record<string, any> = {},
  options: {
    reportRenders?: boolean
    trackState?: boolean
    trackProps?: boolean
  } = {},
) {
  const { reportRenders = true, trackState = false, trackProps = false } = options
  const renderCount = useRef(0)
  const startTime = useRef(Date.now())

  useEffect(() => {
    // Register component with monitoring system
    const unregister = monitorIntegrator.registerComponent(componentId, {
      ...initialMetrics,
      renderCount: 0,
      mountTime: Date.now(),
    })

    return () => {
      // Record unmount metrics
      monitorIntegrator.recordMetrics(componentId, {
        unmountTime: Date.now(),
        totalMountedTime: Date.now() - startTime.current,
        finalRenderCount: renderCount.current,
      })

      // Unregister component
      unregister()
    }
  }, [componentId])

  // Report render
  useEffect(() => {
    if (reportRenders) {
      renderCount.current += 1
      monitorIntegrator.recordMetrics(componentId, {
        renderCount: renderCount.current,
        lastRenderTime: Date.now(),
        timeSinceMount: Date.now() - startTime.current,
      })
    }
  })

  return {
    // Function to record custom metrics
    recordMetrics: (metrics: Record<string, any>) => {
      monitorIntegrator.recordMetrics(componentId, metrics)
    },

    // Get component's health status
    checkHealth: () => monitorIntegrator.checkComponentHealth(componentId),

    // Current render count
    renderCount: renderCount.current,
  }
}
