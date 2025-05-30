import { EventEmitter } from "events"

interface MetricSnapshot {
  timestamp: number
  metrics: Record<string, any>
  source: string
}

export class MonitorIntegrator extends EventEmitter {
  private static instance: MonitorIntegrator
  private activeComponents: Set<string> = new Set()
  private metricHistory: Map<string, MetricSnapshot[]> = new Map()
  private anomalyThresholds: Map<string, number> = new Map()

  constructor() {
    super()
    this.setupHeartbeat()
  }

  static getInstance(): MonitorIntegrator {
    if (!MonitorIntegrator.instance) {
      MonitorIntegrator.instance = new MonitorIntegrator()
    }
    return MonitorIntegrator.instance
  }

  registerComponent(componentId: string, initialMetrics: Record<string, any> = {}) {
    this.activeComponents.add(componentId)

    // Create initial metric snapshot
    this.recordMetrics(componentId, initialMetrics)

    console.log(`[GraveMind] Component registered: ${componentId}`)
    this.emit("component:registered", { componentId, initialMetrics })

    // Return unregister function
    return () => {
      this.activeComponents.delete(componentId)
      console.log(`[GraveMind] Component unregistered: ${componentId}`)
      this.emit("component:unregistered", { componentId })
    }
  }

  recordMetrics(componentId: string, metrics: Record<string, any>) {
    if (!this.activeComponents.has(componentId)) {
      console.warn(`[GraveMind] Attempted to record metrics for unregistered component: ${componentId}`)
      return false
    }

    const snapshot: MetricSnapshot = {
      timestamp: Date.now(),
      metrics,
      source: componentId,
    }

    // Store in history
    if (!this.metricHistory.has(componentId)) {
      this.metricHistory.set(componentId, [])
    }
    this.metricHistory.get(componentId)!.push(snapshot)

    // Trim history if needed (keep last 100 snapshots)
    const history = this.metricHistory.get(componentId)!
    if (history.length > 100) {
      this.metricHistory.set(componentId, history.slice(-100))
    }

    // Check for anomalies
    this.detectAnomalies(componentId, snapshot)

    this.emit("metrics:updated", snapshot)
    return true
  }

  detectAnomalies(componentId: string, currentSnapshot: MetricSnapshot) {
    const history = this.metricHistory.get(componentId) || []
    if (history.length < 5) return // Need enough history for detection

    const anomalies: Record<string, { value: any; threshold: number; average: number }> = {}

    // Check each metric against its history
    Object.entries(currentSnapshot.metrics).forEach(([key, value]) => {
      if (typeof value !== "number") return

      // Calculate average for this metric
      const metricHistory = history
        .slice(0, -1) // Exclude current snapshot
        .map((snapshot) => snapshot.metrics[key])
        .filter((val) => typeof val === "number")

      if (metricHistory.length < 3) return

      const average = metricHistory.reduce((sum, val) => sum + val, 0) / metricHistory.length
      const threshold = this.anomalyThresholds.get(`${componentId}:${key}`) || 0.25 // 25% default

      // Check if current value deviates significantly
      const deviation = Math.abs((value - average) / average)
      if (deviation > threshold) {
        anomalies[key] = { value, threshold, average }
      }
    })

    if (Object.keys(anomalies).length > 0) {
      this.emit("anomaly:detected", { componentId, anomalies, snapshot: currentSnapshot })
    }
  }

  setAnomalyThreshold(componentId: string, metric: string, threshold: number) {
    this.anomalyThresholds.set(`${componentId}:${metric}`, threshold)
  }

  private setupHeartbeat() {
    setInterval(() => {
      const systemMetrics = {
        activeComponents: this.activeComponents.size,
        timestamp: Date.now(),
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      }

      this.emit("system:heartbeat", systemMetrics)
    }, 30000) // 30 seconds
  }

  // Get recent metrics for a component
  getMetrics(componentId: string, limit = 20) {
    return (this.metricHistory.get(componentId) || []).slice(-limit)
  }

  // Check component health
  checkComponentHealth(componentId: string): { healthy: boolean; issues: string[] } {
    if (!this.activeComponents.has(componentId)) {
      return { healthy: false, issues: ["Component not registered"] }
    }

    const history = this.metricHistory.get(componentId) || []
    const issues: string[] = []

    if (history.length === 0) {
      issues.push("No metrics recorded")
    } else {
      const lastUpdate = history[history.length - 1].timestamp
      const now = Date.now()

      if (now - lastUpdate > 60000) {
        // 1 minute
        issues.push("Component not reporting recent metrics")
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
    }
  }
}

// Export singleton instance
export const monitorIntegrator = MonitorIntegrator.getInstance()
