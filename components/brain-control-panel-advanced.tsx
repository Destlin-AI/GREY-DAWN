"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Brain, Network } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface Agent {
  id: string
  name: string
  category: string
  status: "active" | "inactive" | "error"
  features: string[]
}

export function BrainControlPanelAdvanced() {
  const { toast } = useToast()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeAgents, setActiveAgents] = useState<string[]>([])
  const [systemLoad, setSystemLoad] = useState(30)
  const [swarmActive, setSwarmActive] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Fetch agents on component mount
  useEffect(() => {
    fetchAgents()

    // Simulate system load changes
    const loadInterval = setInterval(() => {
      setSystemLoad((prev) => {
        const delta = Math.floor(Math.random() * 10) - 4
        return Math.max(10, Math.min(95, prev + delta))
      })
    }, 5000)

    return () => clearInterval(loadInterval)
  }, [])

  // Fetch agents from API
  const fetchAgents = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/agents")
      if (res.ok) {
        const data = await res.json()
        setAgents(data.agents)
      } else {
        console.error("Error fetching agents:", await res.text())
        toast({
          title: "Error",
          description: "Failed to fetch agents",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching agents:", error)
    } finally {
      setLoading(false)
    }
  }

  // Activate a specific agent
  const activateAgent = async (agentId: string) => {
    if (activeAgents.includes(agentId)) return

    setActiveAgents((prev) => [...prev, agentId])

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "execute",
          agentId,
        }),
      })

      const data = await res.json()

      if (!data.success) {
        toast({
          title: "Agent Execution Failed",
          description: data.error || "Unknown error",
          variant: "destructive",
        })

        // Remove from active agents
        setActiveAgents((prev) => prev.filter((id) => id !== agentId))
      }
    } catch (error) {
      console.error(`Error executing agent ${agentId}:`, error)
      toast({
        title: "Error",
        description: `Failed to execute agent: ${agentId}`,
        variant: "destructive",
      })

      // Remove from active agents
      setActiveAgents((prev) => prev.filter((id) => id !== agentId))
    }
  }

  // Toggle the entire swarm
  const toggleSwarm = async () => {
    if (swarmActive) {
      // Stop all agents
      setActiveAgents([])
      setSwarmActive(false)
    } else {
      // Activate primary agents first
      setSwarmActive(true)

      const primaryAgents = agents.filter((a) => a.category === "swarm" || a.category === "logic").map((a) => a.id)

      setActiveAgents(primaryAgents)

      // Execute each primary agent
      for (const agentId of primaryAgents) {
        await activateAgent(agentId)
      }

      // Then activate secondary agents with a delay
      setTimeout(async () => {
        const secondaryAgents = agents
          .filter((a) => a.category === "memory" || a.category === "neural")
          .map((a) => a.id)

        for (const agentId of secondaryAgents) {
          await activateAgent(agentId)
        }
      }, 2000)
    }
  }

  // Draw agent network visualization
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Animation function
    const drawNetwork = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw center brain
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2

      ctx.beginPath()
      ctx.arc(centerX, centerY, 15, 0, Math.PI * 2)
      ctx.fillStyle = swarmActive ? "#9333ea" : "#64748b"
      ctx.fill()

      // Get visible agents (limit to 12 for visual clarity)
      const visibleAgents = selectedCategory
        ? agents.filter((a) => a.category === selectedCategory).slice(0, 12)
        : agents.slice(0, 12)

      // Draw agents
      const agentCount = visibleAgents.length
      const radius = Math.min(canvas.width, canvas.height) * 0.35

      visibleAgents.forEach((agent, i) => {
        const angle = (i / agentCount) * Math.PI * 2
        const x = centerX + Math.cos(angle) * radius
        const y = centerY + Math.sin(angle) * radius

        // Draw connection
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.lineTo(x, y)
        ctx.strokeStyle = activeAgents.includes(agent.id) ? "#06b6d4" : "#334155"
        ctx.lineWidth = 1
        ctx.stroke()

        // Draw agent node
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, Math.PI * 2)
        ctx.fillStyle = activeAgents.includes(agent.id) ? "#06b6d4" : "#475569"
        ctx.fill()
      })
    }

    drawNetwork()

    // Set up animation loop
    let animationId: number
    const animate = () => {
      drawNetwork()
      animationId = requestAnimationFrame(animate)
    }

    animate()

    // Clean up
    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [agents, activeAgents, swarmActive, selectedCategory])

  // Interface for monitoring and controlling your agent swarm

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-700/50">
        <CardTitle className="flex items-center text-slate-100">
          <Brain className="h-5 w-5 text-purple-500 mr-2" />
          NEXUS Neural Swarm
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-300">Coordinator Model</h3>
              <Badge className="bg-purple-600">Mixtral 8x7B</Badge>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-300">Active Agents</h3>
              <span className="text-sm font-medium text-cyan-400">
                {activeAgents.length} / {agents.length}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-300">System Load</h3>
              <div className="flex items-center">
                <div className="w-24 h-2 bg-slate-700 rounded-full mr-2">
                  <div
                    className={`h-full rounded-full ${systemLoad < 50 ? "bg-green-500" : systemLoad < 80 ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${systemLoad}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-300">{systemLoad}%</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-md p-3">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Agent Network</h3>
            <div className="relative h-32">
              {/* Here you would render a visualization of your agent network */}
              <Network className="h-32 w-32 text-cyan-500/20 absolute top-0 left-0" />
              {/* Add animated dots and connections for agents */}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-medium text-slate-300 mb-2">Active Agents</h3>
          <div className="space-y-2">{/* Render list of active agents with status indicators */}</div>
        </div>
      </CardContent>
    </Card>
  )
}

export { BrainControlPanelAdvanced as BrainControlPanel }
