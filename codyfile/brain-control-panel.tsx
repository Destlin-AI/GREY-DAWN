"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { brainController } from "@/lib/brain-controller"

interface BrainMemoryStats {
  conversationCount: number
  instructionCount: number
  patternCount: number
}

interface BrainStatus {
  status: string
  memory: BrainMemoryStats
  model: string
}

interface Agent {
  id: string
  name: string
  type: string
  model: string
  status: string
  load: number
}

export function BrainControlPanel() {
  const { toast } = useToast()
  const [prompt, setPrompt] = useState("")
  const [response, setResponse] = useState("")
  const [instruction, setInstruction] = useState("")
  const [pattern, setPattern] = useState("")
  const [replacement, setReplacement] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSelfImproving, setIsSelfImproving] = useState(false)
  const [brainStatus, setBrainStatus] = useState<BrainStatus | null>(null)
  const [conversations, setConversations] = useState<Array<{ input: string; response: string; id: number }>>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [activeAgents, setActiveAgents] = useState(0)
  const [systemLoad, setSystemLoad] = useState(0)

  // Fetch brain status on mount
  useEffect(() => {
    const initBrain = async () => {
      try {
        const result = await brainController.initialize()
        setAgents(
          Array.from({ length: result.workers + 1 }, (_, i) => {
            const isCoordinator = i === 0
            return {
              id: isCoordinator ? "coordinator" : `worker-${i - 1}`,
              name: isCoordinator ? "Coordinator" : `Worker ${i}`,
              type: isCoordinator ? "coordinator" : "worker",
              model: isCoordinator ? "mixtral-8x7b" : "phi-3-mini",
              status: "active",
              load: Math.floor(Math.random() * 30) + 10,
            }
          }),
        )
        setActiveAgents(result.workers + 1)
        setSystemLoad(35)
      } catch (error) {
        console.error("Failed to initialize brain:", error)
      }
    }

    initBrain()
  }, [])

  // Add this function to handle agent activation/deactivation
  const toggleAgent = async (agentId: string) => {
    // Implementation to activate/deactivate agents in your swarm
    try {
      const updatedAgents = agents.map((agent) => {
        if (agent.id === agentId) {
          const newStatus = agent.status === "active" ? "inactive" : "active"
          return { ...agent, status: newStatus }
        }
        return agent
      })

      setAgents(updatedAgents)

      // Update active agent count
      const activeCount = updatedAgents.filter((a) => a.status === "active").length
      setActiveAgents(activeCount)

      toast({
        title: "Agent Status Updated",
        description: `Agent ${agentId} is now ${updatedAgents.find((a) => a.id === agentId)?.status}`,
      })
    } catch (error) {
      console.error("Failed to toggle agent:", error)
      toast({
        title: "Error",
        description: "Failed to update agent status",
        variant: "destructive",
      })
    }
  }

  const fetchBrainStatus = async () => {
    try {
      const status = await fetch("/api/brain/status").then((res) => res.json())
      setBrainStatus(status)
    } catch (error) {
      console.error("Failed to fetch brain status:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await fetch("/api/brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      }).then((res) => res.json())

      setResponse(result.response)
      setConversations((prev) => [...prev, { input: prompt, response: result.response, id: Date.now() }])
      setPrompt("")
    } catch (error) {
      console.error("Error querying brain:", error)
      toast({
        title: "Error",
        description: "Failed to get response from brain",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-2xl font-bold">Brain Control Panel</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium">
                Query Brain
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2"
                rows={4}
                placeholder="Enter your query here..."
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !prompt}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Processing..." : "Submit"}
            </button>
          </form>

          {response && (
            <div className="mt-4 p-4 border rounded-md bg-gray-50">
              <h3 className="font-medium">Response:</h3>
              <p className="mt-2 whitespace-pre-wrap">{response}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="p-4 border rounded-md">
            <h3 className="font-medium mb-2">System Status</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-sm text-gray-500">Active Agents</p>
                <p className="font-medium">{activeAgents}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">System Load</p>
                <p className="font-medium">{systemLoad}%</p>
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-md">
            <h3 className="font-medium mb-2">Agent Network</h3>
            <div className="space-y-2">
              {agents.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">{agent.name}</p>
                    <p className="text-sm text-gray-500">{agent.model}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        agent.status === "active" ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <button onClick={() => toggleAgent(agent.id)} className="text-sm text-blue-600 hover:underline">
                      {agent.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
