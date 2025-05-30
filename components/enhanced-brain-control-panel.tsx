"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Brain, Zap, Activity, RotateCw } from "lucide-react"

export function EnhancedBrainControlPanel() {
  const [isActive, setIsActive] = useState(false)
  const [systemLoad, setSystemLoad] = useState(0)
  const [activeAgents, setActiveAgents] = useState(0)
  const [coordinatorModel, setCoordinatorModel] = useState("mistralai/Mistral-7B-Instruct-v0.2")
  const [memoryUsage, setMemoryUsage] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()

  // Simulate brain activity
  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        setSystemLoad((prev) => {
          const fluctuation = Math.random() * 10 - 5
          return Math.min(Math.max(prev + fluctuation, 20), 90)
        })
        setActiveAgents((prev) => {
          const change = Math.random() > 0.7 ? Math.floor(Math.random() * 3) - 1 : 0
          return Math.max(prev + change, 0)
        })
        setMemoryUsage((prev) => {
          const fluctuation = Math.random() * 5 - 2
          return Math.min(Math.max(prev + fluctuation, 10), 95)
        })
      }, 2000)

      return () => clearInterval(interval)
    } else {
      setSystemLoad((prev) => Math.max(prev * 0.9, 5))
      setActiveAgents(0)
      setMemoryUsage((prev) => Math.max(prev * 0.95, 5))
    }
  }, [isActive])

  // Neural network visualization
  useEffect(() => {
    if (!canvasRef.current || activeTab !== "visualization") return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Nodes and connections
    const nodes: { x: number; y: number; size: number; speed: number }[] = []
    const numNodes = 30 + Math.floor(activeAgents * 2)

    // Initialize nodes
    for (let i = 0; i < numNodes; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 2,
        speed: Math.random() * 0.5 + 0.1,
      })
    }

    const animate = () => {
      if (!ctx || !canvas) return

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update and draw nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]

        // Update position
        if (isActive) {
          node.x += (Math.random() - 0.5) * node.speed
          node.y += (Math.random() - 0.5) * node.speed

          // Keep within bounds
          if (node.x < 0) node.x = canvas.width
          if (node.x > canvas.width) node.x = 0
          if (node.y < 0) node.y = canvas.height
          if (node.y > canvas.height) node.y = 0
        }

        // Draw node
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2)
        ctx.fillStyle = isActive ? "#0ea5e9" : "#64748b"
        ctx.fill()

        // Draw connections
        for (let j = i + 1; j < nodes.length; j++) {
          const otherNode = nodes[j]
          const dx = otherNode.x - node.x
          const dy = otherNode.y - node.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 100) {
            ctx.beginPath()
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(otherNode.x, otherNode.y)
            ctx.strokeStyle = isActive
              ? `rgba(14, 165, 233, ${0.8 - distance / 100})`
              : `rgba(100, 116, 139, ${0.5 - distance / 100})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [canvasRef, activeTab, isActive, activeAgents])

  const toggleBrain = async () => {
    setIsLoading(true)

    // Simulate API call to toggle brain state
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setIsActive(!isActive)
    setIsLoading(false)
  }

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm overflow-hidden">
      <CardHeader className="border-b border-slate-700/50 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-slate-100 flex items-center">
            <Brain className="mr-2 h-5 w-5 text-cyan-500" />
            Neural Core
          </CardTitle>
          <Badge
            variant="outline"
            className={
              isActive
                ? "bg-green-900/20 text-green-400 border-green-500/30"
                : "bg-slate-800/50 text-slate-400 border-slate-700"
            }
          >
            {isActive ? "Active" : "Standby"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full rounded-none border-b border-slate-700/50 bg-transparent">
            <TabsTrigger
              value="overview"
              className="rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 data-[state=active]:text-cyan-400"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="visualization"
              className="rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 data-[state=active]:text-cyan-400"
            >
              Neural Map
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 data-[state=active]:text-cyan-400"
            >
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Activity className="h-4 w-4 text-cyan-500 mr-2" />
                  <span className="text-sm text-slate-300">System Load</span>
                </div>
                <span className="text-sm font-medium text-cyan-400">{Math.round(systemLoad)}%</span>
              </div>
              <Progress value={systemLoad} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Zap className="h-4 w-4 text-cyan-500 mr-2" />
                  <span className="text-sm text-slate-300">Active Agents</span>
                </div>
                <span className="text-sm font-medium text-cyan-400">{activeAgents}</span>
              </div>
              <Progress value={activeAgents * 5} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Brain className="h-4 w-4 text-cyan-500 mr-2" />
                  <span className="text-sm text-slate-300">Memory Usage</span>
                </div>
                <span className="text-sm font-medium text-cyan-400">{Math.round(memoryUsage)}%</span>
              </div>
              <Progress value={memoryUsage} className="h-2" />
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Coordinator Model:</span>
                <span className="text-slate-300 font-mono">{coordinatorModel}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="visualization" className="p-0">
            <div className="relative w-full h-[200px]">
              <canvas ref={canvasRef} className="w-full h-full" />
              <div className="absolute bottom-2 right-2">
                <Badge variant="outline" className="bg-slate-800/50 text-slate-300 border-slate-700">
                  {activeAgents} agents
                </Badge>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-slate-300">Self-Repair</h4>
                <p className="text-xs text-slate-400">Enable automatic code repair</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-slate-300">Memory Persistence</h4>
                <p className="text-xs text-slate-400">Save conversation history</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-slate-300">Multi-Model Processing</h4>
                <p className="text-xs text-slate-400">Use multiple models for complex tasks</p>
              </div>
              <Switch defaultChecked />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="border-t border-slate-700/50 p-3">
        <Button
          onClick={toggleBrain}
          disabled={isLoading}
          className={isActive ? "bg-red-600 hover:bg-red-700 w-full" : "bg-cyan-600 hover:bg-cyan-700 w-full"}
        >
          {isLoading ? (
            <>
              <RotateCw className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : isActive ? (
            <>
              <Brain className="mr-2 h-4 w-4" />
              Deactivate Neural Core
            </>
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" />
              Activate Neural Core
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
