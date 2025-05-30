"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { ProtectedRoute } from "@/components/protected-route"
import {
  ArrowLeft,
  Code,
  Play,
  Save,
  Download,
  Upload,
  Plus,
  Trash2,
  Settings,
  Wand2,
  Braces,
  FileCode,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Tool {
  id: string
  name: string
  description: string
  type: string
  language: string
  code: string
  aiAssisted: boolean
  createdAt: string
  lastModified: string
}

export default function ToolMakerPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("editor")
  const [tools, setTools] = useState<Tool[]>([])
  const [currentTool, setCurrentTool] = useState<Tool>({
    id: "",
    name: "New Tool",
    description: "Description of your tool",
    type: "utility",
    language: "javascript",
    code: "// Write your code here\n\nfunction main() {\n  console.log('Hello, world!');\n  return 'Tool executed successfully';\n}\n\nexport default main;",
    aiAssisted: false,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
  })
  const [output, setOutput] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  // Load saved tools on mount
  useEffect(() => {
    // In a real app, this would fetch from an API
    const savedTools = localStorage.getItem("ai-tools")
    if (savedTools) {
      try {
        setTools(JSON.parse(savedTools))
      } catch (e) {
        console.error("Failed to parse saved tools", e)
      }
    }
  }, [])

  // Save tools when they change
  useEffect(() => {
    if (tools.length > 0) {
      localStorage.setItem("ai-tools", JSON.stringify(tools))
    }
  }, [tools])

  const createNewTool = () => {
    const newTool = {
      id: Date.now().toString(),
      name: "New Tool",
      description: "Description of your tool",
      type: "utility",
      language: "javascript",
      code: "// Write your code here\n\nfunction main() {\n  console.log('Hello, world!');\n  return 'Tool executed successfully';\n}\n\nexport default main;",
      aiAssisted: false,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    }

    setCurrentTool(newTool)
    setTools([...tools, newTool])
    setActiveTab("editor")

    toast({
      title: "New tool created",
      description: "Start building your tool in the editor.",
    })
  }

  const saveTool = () => {
    const updatedTool = {
      ...currentTool,
      lastModified: new Date().toISOString(),
    }

    setTools(tools.map((tool) => (tool.id === currentTool.id ? updatedTool : tool)))
    setCurrentTool(updatedTool)

    toast({
      title: "Tool saved",
      description: "Your changes have been saved successfully.",
    })
  }

  const deleteTool = (id: string) => {
    setTools(tools.filter((tool) => tool.id !== id))

    if (currentTool.id === id) {
      if (tools.length > 1) {
        const remainingTool = tools.find((tool) => tool.id !== id)
        if (remainingTool) setCurrentTool(remainingTool)
      } else {
        createNewTool()
      }
    }

    toast({
      title: "Tool deleted",
      description: "The tool has been removed.",
    })
  }

  const runTool = () => {
    setIsRunning(true)
    setOutput("")

    // In a real app, this would send the code to a secure backend for execution
    setTimeout(() => {
      try {
        // This is just a simulation - in a real app, we'd use a secure sandbox
        const consoleOutput: string[] = []
        const originalConsoleLog = console.log
        console.log = (...args) => {
          consoleOutput.push(args.join(" "))
          originalConsoleLog(...args)
        }

        // Simulate execution
        const result = `Execution result:\n\n${consoleOutput.join("\n")}\n\nTool executed successfully at ${new Date().toLocaleTimeString()}`

        setOutput(result)
        console.log = originalConsoleLog
      } catch (error) {
        setOutput(`Error: ${error instanceof Error ? error.message : String(error)}`)
      } finally {
        setIsRunning(false)
      }
    }, 1500)
  }

  const handleExportTool = (tool: Tool) => {
    try {
      const toolData = JSON.stringify(tool, null, 2)
      const blob = new Blob([toolData], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${tool.name.toLowerCase().replace(/\s+/g, "-")}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Tool Exported",
        description: `${tool.name} has been exported successfully.`,
      })
    } catch (error) {
      console.error("Error exporting tool:", error)
      toast({
        title: "Export Failed",
        description: "Failed to export the tool",
        variant: "destructive",
      })
    }
  }

  const handleImportTool = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = async (e) => {
      try {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return

        const content = await file.text()
        const toolData = JSON.parse(content) as Tool

        // Validate the imported tool has required fields
        if (!toolData.name || !toolData.code) {
          throw new Error("Invalid tool format")
        }

        // Generate a new ID and timestamps for the imported tool
        const importedTool: Tool = {
          ...toolData,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
        }

        setTools([...tools, importedTool])
        setCurrentTool(importedTool)

        toast({
          title: "Tool Imported",
          description: `${importedTool.name} has been imported successfully.`,
        })
      } catch (error) {
        console.error("Error importing tool:", error)
        toast({
          title: "Import Failed",
          description: "Failed to import the tool. Make sure the file is valid.",
          variant: "destructive",
        })
      }
    }
    input.click()
  }

  const generateWithAI = () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Empty prompt",
        description: "Please enter a prompt for the AI.",
        variant: "destructive",
      })
      return
    }
    setIsGenerating(true)

    // In a real app, this would call an AI API
    setTimeout(() => {
      const generatedCode = `// Generated based on: ${aiPrompt}\n\nfunction main() {\n  console.log('AI generated function');\n  \n  // Simulated functionality based on the prompt\n  const result = processUserRequest('${aiPrompt.replace(/'/g, "\\'")}');\n  return result;\n}\n\nfunction processUserRequest(request) {\n  // This would contain the actual implementation\n  console.log('Processing:', request);\n  return 'Request processed successfully';\n}\n\nexport default main;`

      setCurrentTool({
        ...currentTool,
        code: generatedCode,
        aiAssisted: true,
        lastModified: new Date().toISOString(),
      })

      setIsGenerating(false)
      setAiPrompt("")

      toast({
        title: "Code generated",
        description: "AI has generated code based on your prompt.",
      })
    }, 2000)
  }

  const selectTool = (tool: Tool) => {
    setCurrentTool(tool)
    setActiveTab("editor")
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-4 relative z-10">
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="border-b border-slate-700/50 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="mr-2 text-slate-400 hover:text-slate-100"
                  onClick={() => router.push("/dashboard")}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <CardTitle className="text-slate-100 flex items-center">
                  <Wand2 className="mr-2 h-5 w-5 text-cyan-500" />
                  AI Tool Maker
                </CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  className="border-slate-700 bg-slate-800/50 hover:bg-slate-700/50"
                  onClick={createNewTool}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Tool
                </Button>
                <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={saveTool}>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-12 h-[calc(100vh-16rem)]">
              {/* Tool List Sidebar */}
              <div className="col-span-3 border-r border-slate-700/50 overflow-y-auto">
                <div className="p-4">
                  <Input placeholder="Search tools..." className="bg-slate-800/50 border-slate-700 mb-4" />

                  <div className="space-y-2">
                    {tools.map((tool) => (
                      <div
                        key={tool.id}
                        className={`p-3 rounded-md cursor-pointer ${currentTool.id === tool.id ? "bg-slate-700" : "bg-slate-800/50 hover:bg-slate-700/50"}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-slate-200">{tool.name}</div>
                            <div className="text-xs text-slate-400">{tool.type}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-slate-100 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteTool(tool.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center mt-2">
                          <Badge
                            variant="outline"
                            className="text-xs bg-slate-800/50 border-slate-600 text-slate-300 mr-2"
                          >
                            {tool.language}
                          </Badge>
                          {tool.aiAssisted && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-purple-900/20 border-purple-500/50 text-purple-300"
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              AI Assisted
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="col-span-9 flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                  <div className="border-b border-slate-700/50">
                    <TabsList className="bg-transparent p-0 h-12">
                      <TabsTrigger
                        value="editor"
                        className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 data-[state=active]:text-cyan-400 rounded-none h-12 px-6"
                      >
                        <Code className="mr-2 h-4 w-4" />
                        Editor
                      </TabsTrigger>
                      <TabsTrigger
                        value="ai"
                        className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 data-[state=active]:text-cyan-400 rounded-none h-12 px-6"
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        AI Assistant
                      </TabsTrigger>
                      <TabsTrigger
                        value="settings"
                        className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 data-[state=active]:text-cyan-400 rounded-none h-12 px-6"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="editor" className="flex-1 flex flex-col p-0 m-0">
                    <div className="grid grid-cols-2 h-full">
                      <div className="border-r border-slate-700/50 flex flex-col">
                        <div className="p-4 border-b border-slate-700/50">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                              <FileCode className="h-5 w-5 text-cyan-500 mr-2" />
                              <Input
                                value={currentTool.name}
                                onChange={(e) => setCurrentTool({ ...currentTool, name: e.target.value })}
                                className="bg-transparent border-none text-lg font-medium text-slate-100 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                              />
                            </div>
                            <Select
                              value={currentTool.language}
                              onValueChange={(value) => setCurrentTool({ ...currentTool, language: value })}
                            >
                              <SelectTrigger className="w-32 bg-slate-800 border-slate-700">
                                <SelectValue placeholder="Language" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="javascript">JavaScript</SelectItem>
                                <SelectItem value="typescript">TypeScript</SelectItem>
                                <SelectItem value="python">Python</SelectItem>
                                <SelectItem value="bash">Bash</SelectItem>
                                <SelectItem value="sql">SQL</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Textarea
                            value={currentTool.description}
                            onChange={(e) => setCurrentTool({ ...currentTool, description: e.target.value })}
                            placeholder="Tool description..."
                            className="bg-slate-800/50 border-slate-700 resize-none h-20"
                          />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="h-full flex flex-col">
                            <div className="p-2 bg-slate-800/50 border-b border-slate-700/50 flex items-center">
                              <Badge variant="outline" className="bg-slate-700/50 text-slate-300 border-slate-600">
                                <Braces className="h-3 w-3 mr-1" />
                                {currentTool.language}
                              </Badge>
                            </div>
                            <Textarea
                              value={currentTool.code}
                              onChange={(e) => setCurrentTool({ ...currentTool, code: e.target.value })}
                              className="flex-1 font-mono text-sm bg-slate-800/30 border-none rounded-none resize-none p-4 focus-visible:ring-0 focus-visible:ring-offset-0"
                              style={{ minHeight: "300px" }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                          <h3 className="text-base font-medium text-slate-100">Output</h3>
                          <Button onClick={runTool} disabled={isRunning} className="bg-green-600 hover:bg-green-700">
                            {isRunning ? (
                              <>
                                <svg
                                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  ></circle>
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  ></path>
                                </svg>
                                Running...
                              </>
                            ) : (
                              <>
                                <Play className="mr-2 h-4 w-4" />
                                Run Tool
                              </>
                            )}
                          </Button>
                        </div>
                        <div className="flex-1 p-4 bg-slate-800/30 font-mono text-sm overflow-auto">
                          {output ? (
                            <pre className="whitespace-pre-wrap">{output}</pre>
                          ) : (
                            <div className="text-slate-500 italic">Run the tool to see output here...</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="ai" className="flex-1 p-0 m-0">
                    <div className="grid grid-cols-2 h-full">
                      <div className="border-r border-slate-700/50 p-4 flex flex-col">
                        <h3 className="text-lg font-medium text-slate-100 mb-2 flex items-center">
                          <Sparkles className="h-5 w-5 text-purple-400 mr-2" />
                          AI Code Generator
                        </h3>
                        <p className="text-sm text-slate-400 mb-4">
                          Describe what you want your tool to do, and our AI will generate the code for you.
                        </p>

                        <div className="space-y-4 flex-1 flex flex-col">
                          <Textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="Describe the tool you want to create..."
                            className="flex-1 bg-slate-800/50 border-slate-700 resize-none min-h-[200px]"
                          />

                          <div className="space-y-2">
                            <Label className="text-slate-300">Options</Label>
                            <div className="grid grid-cols-2 gap-4">
                              <Select defaultValue="javascript">
                                <SelectTrigger className="bg-slate-800 border-slate-700">
                                  <SelectValue placeholder="Language" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                  <SelectItem value="javascript">JavaScript</SelectItem>
                                  <SelectItem value="typescript">TypeScript</SelectItem>
                                  <SelectItem value="python">Python</SelectItem>
                                </SelectContent>
                              </Select>

                              <Select defaultValue="utility">
                                <SelectTrigger className="bg-slate-800 border-slate-700">
                                  <SelectValue placeholder="Tool Type" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                  <SelectItem value="utility">Utility</SelectItem>
                                  <SelectItem value="data-processing">Data Processing</SelectItem>
                                  <SelectItem value="automation">Automation</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <Button
                            onClick={generateWithAI}
                            disabled={isGenerating || !aiPrompt.trim()}
                            className="bg-purple-600 hover:bg-purple-700 w-full"
                          >
                            {isGenerating ? (
                              <>
                                <svg
                                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  ></circle>
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  ></path>
                                </svg>
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate Code
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="p-4">
                        <h3 className="text-lg font-medium text-slate-100 mb-4">AI Assistant Tips</h3>

                        <div className="space-y-4">
                          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                            <h4 className="text-base font-medium text-slate-200 mb-2">Writing Effective Prompts</h4>
                            <ul className="text-sm text-slate-400 space-y-2 list-disc pl-5">
                              <li>Be specific about what you want the tool to do</li>
                              <li>Mention input and output requirements</li>
                              <li>Specify any libraries or frameworks to use</li>
                              <li>Include error handling requirements</li>
                            </ul>
                          </div>

                          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                            <h4 className="text-base font-medium text-slate-200 mb-2">Example Prompts</h4>
                            <div className="space-y-3 text-sm">
                              <div className="bg-slate-700/50 p-3 rounded-md text-slate-300">
                                "Create a tool that converts CSV data to JSON format, handling escaped commas and quotes
                                properly."
                              </div>
                              <div className="bg-slate-700/50 p-3 rounded-md text-slate-300">
                                "Build a utility that validates email addresses and returns whether they are valid or
                                not, with reasons for invalid emails."
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="settings" className="p-4 m-0">
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <h3 className="text-lg font-medium text-slate-100 mb-4">Tool Settings</h3>

                        <div className="space-y-6">
                          <div className="space-y-2">
                            <Label htmlFor="tool-type" className="text-slate-300">
                              Tool Type
                            </Label>
                            <Select
                              value={currentTool.type}
                              onValueChange={(value) => setCurrentTool({ ...currentTool, type: value })}
                            >
                              <SelectTrigger id="tool-type" className="bg-slate-800 border-slate-700">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="utility">Utility</SelectItem>
                                <SelectItem value="data-processing">Data Processing</SelectItem>
                                <SelectItem value="automation">Automation</SelectItem>
                                <SelectItem value="integration">Integration</SelectItem>
                                <SelectItem value="analysis">Analysis</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-base font-medium text-slate-300">AI Assisted</h4>
                              <p className="text-sm text-slate-400">This tool was created with AI assistance</p>
                            </div>
                            <Switch
                              checked={currentTool.aiAssisted}
                              onCheckedChange={(checked) => setCurrentTool({ ...currentTool, aiAssisted: checked })}
                            />
                          </div>

                          <div className="pt-4 border-t border-slate-700/50">
                            <h4 className="text-base font-medium text-slate-300 mb-2">Export & Import</h4>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                className="border-slate-700 bg-slate-800/50 hover:bg-slate-700/50"
                                onClick={() => handleExportTool(currentTool)}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Export Tool
                              </Button>
                              <Button
                                variant="outline"
                                className="border-slate-700 bg-slate-800/50 hover:bg-slate-700/50"
                                onClick={handleImportTool}
                              >
                                <Upload className="mr-2 h-4 w-4" />
                                Import Tool
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-medium text-slate-100 mb-4">Advanced Settings</h3>

                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-base font-medium text-slate-300">Auto-Save</h4>
                              <p className="text-sm text-slate-400">Automatically save changes</p>
                            </div>
                            <Switch defaultChecked />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-base font-medium text-slate-300">Syntax Highlighting</h4>
                              <p className="text-sm text-slate-400">Enable code syntax highlighting</p>
                            </div>
                            <Switch defaultChecked />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-base font-medium text-slate-300">Auto-Format Code</h4>
                              <p className="text-sm text-slate-400">Format code on save</p>
                            </div>
                            <Switch defaultChecked />
                          </div>

                          <div className="pt-4 border-t border-slate-700/50">
                            <h4 className="text-base font-medium text-slate-300 mb-2">Danger Zone</h4>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="destructive">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Tool
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
                                <DialogHeader>
                                  <DialogTitle>Are you sure?</DialogTitle>
                                  <DialogDescription className="text-slate-400">
                                    This action cannot be undone. This will permanently delete your tool.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button
                                    variant="outline"
                                    className="border-slate-700 bg-slate-800/50 hover:bg-slate-700/50"
                                  >
                                    Cancel
                                  </Button>
                                  <Button variant="destructive" onClick={() => deleteTool(currentTool.id)}>
                                    Delete
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t border-slate-700/50 p-4">
            <div className="flex items-center justify-between w-full">
              <div className="text-xs text-slate-400">
                Last modified: {new Date(currentTool.lastModified).toLocaleString()}
              </div>
              <div className="flex items-center space-x-4">
                <Button variant="outline" className="border-slate-700 bg-slate-800/50 hover:bg-slate-700/50">
                  <Settings className="mr-2 h-4 w-4" />
                  Tool Settings
                </Button>
                <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={runTool}>
                  <Play className="mr-2 h-4 w-4" />
                  Run Tool
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
