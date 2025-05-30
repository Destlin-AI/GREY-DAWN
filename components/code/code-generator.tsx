"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Sparkles, Code, Save, Play } from "lucide-react"

export function CodeGenerator() {
  const { toast } = useToast()
  const [description, setDescription] = useState("")
  const [projectName, setProjectName] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedCode, setGeneratedCode] = useState<{ [key: string]: string }>({})
  const [activeFile, setActiveFile] = useState("")

  const generateCode = async () => {
    if (!description.trim()) {
      toast({
        title: "Description required",
        description: "Please provide a description of what you want to build",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch("/api/brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Generate a complete implementation for: ${description}
                  Create multiple files as needed for a fully working solution.
                  Structure it properly for a Next.js project.
                  Make sure to include all necessary imports and setup code.`,
          action: "code",
        }),
      })

      if (!response.ok) throw new Error("Failed to generate code")

      const data = await response.json()
      setGeneratedCode(data.files || {})

      if (Object.keys(data.files || {}).length > 0) {
        setActiveFile(Object.keys(data.files)[0])
        toast({
          title: "Code generated",
          description: `Generated ${Object.keys(data.files).length} files based on your description`,
        })
      }
    } catch (error) {
      console.error("Error generating code:", error)
      toast({
        title: "Generation failed",
        description: "Failed to generate code. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const saveProject = async () => {
    if (!projectName.trim()) {
      toast({
        title: "Project name required",
        description: "Please provide a name for your project",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName,
          description,
          files: generatedCode,
        }),
      })

      if (!response.ok) throw new Error("Failed to save project")

      toast({
        title: "Project saved",
        description: `Project "${projectName}" has been saved successfully`,
      })
    } catch (error) {
      console.error("Error saving project:", error)
      toast({
        title: "Save failed",
        description: "Failed to save project. Please try again.",
        variant: "destructive",
      })
    }
  }

  const deployProject = async () => {
    toast({
      title: "Deploying project",
      description: "This would deploy your project to a hosting service",
    })
    // Implementation would connect to Vercel, Netlify, etc.
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center">
            <Sparkles className="mr-2 h-5 w-5 text-cyan-500" />
            AI Code Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Describe what you want to build</label>
            <Textarea
              placeholder="E.g., Create a contact form with email validation that sends submissions to an API endpoint"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-slate-800/50 border-slate-700 text-slate-100 h-32"
            />
          </div>

          <Button
            onClick={generateCode}
            disabled={isGenerating || !description.trim()}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
          >
            {isGenerating ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Generating Code...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Code
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {Object.keys(generatedCode).length > 0 && (
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-100 flex items-center">
                <Code className="mr-2 h-5 w-5 text-cyan-500" />
                Generated Code
              </CardTitle>
              <div className="flex space-x-2">
                <Input
                  placeholder="Project name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="bg-slate-800/50 border-slate-700 text-slate-100 w-48"
                />
                <Button onClick={saveProject} className="bg-cyan-600 hover:bg-cyan-700">
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button onClick={deployProject} className="bg-blue-600 hover:bg-blue-700">
                  <Play className="mr-2 h-4 w-4" />
                  Deploy
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-12 h-[500px]">
              <div className="col-span-3 border-r border-slate-700/50 overflow-y-auto p-4">
                <div className="space-y-2">
                  {Object.keys(generatedCode).map((filename) => (
                    <div
                      key={filename}
                      className={`p-2 rounded cursor-pointer ${
                        activeFile === filename ? "bg-slate-700 text-cyan-400" : "text-slate-300 hover:bg-slate-800"
                      }`}
                      onClick={() => setActiveFile(filename)}
                    >
                      {filename}
                    </div>
                  ))}
                </div>
              </div>
              <div className="col-span-9 overflow-auto">
                {activeFile && (
                  <pre className="p-4 text-slate-300 text-sm font-mono whitespace-pre-wrap">
                    {generatedCode[activeFile]}
                  </pre>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
