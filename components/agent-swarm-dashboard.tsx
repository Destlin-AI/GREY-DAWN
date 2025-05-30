"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { logger } from "@/lib/utils"
import { AlertCircle, CheckCircle, Play, RefreshCw } from "lucide-react"

interface Agent {
  id: string
  name: string
  description: string
  type: string
  category: string
  status: "idle" | "running" | "completed" | "error"
}

export default function AgentSwarmDashboard() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState("all")
  const [executingAgents, setExecutingAgents] = useState<string[]>([])

  const categories = [
    { id: "all", name: "All Agents" },
    { id: "memory", name: "Memory Agents" },
    { id: "logic", name: "Logic Agents" },
    { id: "swarm", name: "Swarm Agents" },
    { id: "gpu", name: "GPU Agents" },
    { id: "quantum", name: "Quantum Agents" },
    { id: "neural", name: "Neural Agents" },
    { id: "code", name: "Code Agents" },
  ]

  useEffect(() => {
    fetchAgents()
    const interval = setInterval(fetchAgents, 10000) // Poll every 10 seconds
    return () => clearInterval(interval)
  }, [])

  async function fetchAgents() {
    try {
      setLoading(true)
      const response = await fetch("/api/agents")
      if (!response.ok) throw new Error("Failed to fetch agents")
      const data = await response.json()
      setAgents(data)
    } catch (error) {
      logger.error("Error fetching agents:", error)
    } finally {
      setLoading(false)
    }
  }

  async function executeAgent(agentId: string) {
    try {
      setExecutingAgents((prev) => [...prev, agentId])
      const response = await fetch(`/api/agents/${agentId}/execute`, {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to execute agent")

      // Update the agent status
      fetchAgents()
    } catch (error) {
      logger.error(`Error executing agent ${agentId}:`, error)
    } finally {
      setExecutingAgents((prev) => prev.filter((id) => id !== agentId))
    }
  }

  const filteredAgents = activeCategory === "all" ? agents : agents.filter((agent) => agent.category === activeCategory)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Agent Swarm Dashboard</h2>
        <Button onClick={fetchAgents} variant="outline" size="sm" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="all" onValueChange={setActiveCategory}>
        <TabsList className="grid grid-cols-4 md:grid-cols-8 mb-4">
          {categories.map((category) => (
            <TabsTrigger key={category.id} value={category.id}>
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category.id} value={category.id} className="mt-0">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-6 w-3/4" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-2/3" />
                      <div className="mt-4 flex justify-between">
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAgents.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    No agents found in this category.
                  </div>
                ) : (
                  filteredAgents.map((agent) => (
                    <Card key={agent.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{agent.name}</CardTitle>
                          <StatusBadge status={agent.status} />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">{agent.description}</p>
                        <div className="flex gap-2 mb-4">
                          <Badge variant="outline">{agent.type}</Badge>
                          <Badge variant="secondary">{agent.category}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">ID: {agent.id}</span>
                          <Button
                            size="sm"
                            onClick={() => executeAgent(agent.id)}
                            disabled={executingAgents.includes(agent.id) || agent.status === "running"}
                            className="flex items-center gap-1"
                          >
                            {executingAgents.includes(agent.id) ? (
                              <>
                                <RefreshCw className="h-3 w-3 animate-spin" />
                                Running...
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3" />
                                Execute
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function StatusBadge({ status }: { status: Agent["status"] }) {
  switch (status) {
    case "running":
      return (
        <Badge className="bg-blue-500">
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          Running
        </Badge>
      )
    case "completed":
      return (
        <Badge className="bg-green-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      )
    case "error":
      return (
        <Badge className="bg-red-500">
          <AlertCircle className="h-3 w-3 mr-1" />
          Error
        </Badge>
      )
    default:
      return <Badge variant="outline">Idle</Badge>
  }
}

export { AgentSwarmDashboard }
