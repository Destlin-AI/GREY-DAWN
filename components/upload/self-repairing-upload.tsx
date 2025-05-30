"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
import { Upload, FileCode, Check, AlertTriangle, Sparkles, RotateCw } from "lucide-react"

export function SelfRepairingUpload() {
  const { toast } = useToast()
  const [files, setFiles] = useState<File[]>([])
  const [fileContent, setFileContent] = useState("")
  const [fileName, setFileName] = useState("")
  const [fileType, setFileType] = useState("")
  const [isRepairing, setIsRepairing] = useState(false)
  const [repairProgress, setRepairProgress] = useState(0)
  const [repairEnabled, setRepairEnabled] = useState(true)
  const [activeTab, setActiveTab] = useState("upload")
  const [issues, setIssues] = useState<{ severity: string; message: string; line?: number }[]>([])
  const [repairedContent, setRepairedContent] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const selectedFiles = Array.from(e.target.files)
    setFiles(selectedFiles)

    // Read the first file
    const file = selectedFiles[0]
    setFileName(file.name)

    // Determine file type
    const extension = file.name.split(".").pop()?.toLowerCase() || ""
    setFileType(extension)

    // Read file content
    const reader = new FileReader()
    reader.onload = async (event) => {
      const content = event.target?.result as string
      setFileContent(content)

      // If repair is enabled, analyze the file
      if (repairEnabled) {
        await analyzeFile(content, extension)
      }
    }
    reader.readAsText(file)
  }

  const analyzeFile = async (content: string, fileType: string) => {
    setIsRepairing(true)
    setRepairProgress(10)
    setActiveTab("analysis")

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setRepairProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 300)

      // Call API to analyze file
      const response = await fetch("/api/analyze-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content, fileType }),
      })

      if (!response.ok) {
        throw new Error("Failed to analyze file")
      }

      const data = await response.json()

      // Clear interval and set progress to 100%
      clearInterval(progressInterval)
      setRepairProgress(100)

      // Process analysis results
      if (data.suggestions && data.suggestions.length > 0) {
        // Convert suggestions to issues
        const fileIssues = data.suggestions.map((suggestion: string, index: number) => ({
          severity: index === 0 ? "error" : "warning",
          message: suggestion,
        }))

        setIssues(fileIssues)

        // If there are issues, generate repaired content
        if (fileIssues.length > 0) {
          await repairFile(content, fileIssues)
        }
      } else {
        setIssues([])
        toast({
          title: "Analysis complete",
          description: "No issues found in the file.",
        })
      }
    } catch (error) {
      console.error("Error analyzing file:", error)
      toast({
        title: "Analysis failed",
        description: "Failed to analyze the file. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRepairing(false)
    }
  }

  const repairFile = async (content: string, fileIssues: any[]) => {
    setIsRepairing(true)

    try {
      // Call the brain API to repair the file
      const response = await fetch("/api/brain/enhanced", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          componentCode: content,
          errorMessage: fileIssues.map((issue) => issue.message).join("\n"),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to repair file")
      }

      const data = await response.json()

      if (data.success && data.repairedCode) {
        setRepairedContent(data.repairedCode)
        toast({
          title: "Repair complete",
          description: "The file has been repaired. Review the changes before saving.",
        })
      } else {
        toast({
          title: "Repair incomplete",
          description: "Could not fully repair the file. Manual fixes may be needed.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error repairing file:", error)
      toast({
        title: "Repair failed",
        description: "Failed to repair the file. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRepairing(false)
    }
  }

  const saveRepairedFile = async () => {
    try {
      // Upload the repaired content
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: fileName,
          content: repairedContent || fileContent,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save file")
      }

      toast({
        title: "File saved",
        description: "The file has been saved successfully.",
      })

      // Reset state
      setActiveTab("upload")
      setFileContent("")
      setFileName("")
      setFileType("")
      setIssues([])
      setRepairedContent("")
      setFiles([])

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      console.error("Error saving file:", error)
      toast({
        title: "Save failed",
        description: "Failed to save the file. Please try again.",
        variant: "destructive",
      })
    }
  }

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm overflow-hidden">
      <CardHeader className="border-b border-slate-700/50 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-slate-100 flex items-center">
            <Upload className="mr-2 h-5 w-5 text-cyan-500" />
            Self-Repairing Uploader
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Label htmlFor="repair-toggle" className="text-sm text-slate-400">
              Auto-Repair
            </Label>
            <Switch
              id="repair-toggle"
              checked={repairEnabled}
              onCheckedChange={setRepairEnabled}
              className="data-[state=checked]:bg-cyan-500"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full rounded-none border-b border-slate-700/50 bg-transparent">
            <TabsTrigger
              value="upload"
              className="rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 data-[state=active]:text-cyan-400"
            >
              Upload
            </TabsTrigger>
            <TabsTrigger
              value="analysis"
              className="rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 data-[state=active]:text-cyan-400"
              disabled={!fileContent}
            >
              Analysis
            </TabsTrigger>
            <TabsTrigger
              value="repair"
              className="rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 data-[state=active]:text-cyan-400"
              disabled={!repairedContent}
            >
              Repair
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="p-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div
                className="border-2 border-dashed border-slate-700 rounded-lg p-12 w-full text-center cursor-pointer hover:border-cyan-500/50 transition-colors"
                onClick={triggerFileInput}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".js,.jsx,.ts,.tsx,.py,.json,.html,.css"
                />
                <FileCode className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-300 mb-2">Drag & drop or click to upload</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  Upload code files for analysis and automatic repair. Supported formats: .js, .jsx, .ts, .tsx, .py,
                  .json, .html, .css
                </p>
              </div>

              {files.length > 0 && (
                <div className="w-full">
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Selected Files:</h4>
                  <ul className="space-y-2">
                    {files.map((file, index) => (
                      <li key={index} className="bg-slate-800/50 p-2 rounded-md flex items-center justify-between">
                        <div className="flex items-center">
                          <FileCode className="h-4 w-4 text-cyan-500 mr-2" />
                          <span className="text-sm text-slate-300">{file.name}</span>
                        </div>
                        <Badge variant="outline" className="bg-slate-700/50 text-slate-300 border-slate-600">
                          {file.size < 1024 ? `${file.size} B` : `${Math.round(file.size / 1024)} KB`}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="p-6">
            {isRepairing ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <RotateCw className="h-8 w-8 text-cyan-500 animate-spin" />
                <h3 className="text-lg font-medium text-slate-300">Analyzing file...</h3>
                <div className="w-full max-w-md">
                  <Progress value={repairProgress} className="h-2" />
                  <p className="text-sm text-slate-400 text-center mt-2">
                    {repairProgress < 100
                      ? "Scanning for issues and generating fixes..."
                      : "Analysis complete. Processing results..."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-800/50 rounded-md p-4">
                  <h3 className="text-base font-medium text-slate-300 mb-2 flex items-center">
                    <FileCode className="h-4 w-4 text-cyan-500 mr-2" />
                    {fileName}
                  </h3>

                  {issues.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-slate-300">
                        Found {issues.length} issue{issues.length !== 1 ? "s" : ""}:
                      </h4>
                      <ul className="space-y-2">
                        {issues.map((issue, index) => (
                          <li
                            key={index}
                            className={`p-2 rounded-md ${
                              issue.severity === "error"
                                ? "bg-red-900/20 border border-red-500/30"
                                : "bg-amber-900/20 border border-amber-500/30"
                            }`}
                          >
                            <div className="flex items-start">
                              {issue.severity === "error" ? (
                                <AlertTriangle className="h-4 w-4 text-red-400 mr-2 mt-0.5" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-amber-400 mr-2 mt-0.5" />
                              )}
                              <div>
                                <p
                                  className={`text-sm ${
                                    issue.severity === "error" ? "text-red-300" : "text-amber-300"
                                  }`}
                                >
                                  {issue.message}
                                </p>
                                {issue.line && <p className="text-xs text-slate-400 mt-1">Line: {issue.line}</p>}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>

                      <div className="pt-2">
                        <Button
                          onClick={() => setActiveTab("repair")}
                          disabled={!repairedContent}
                          className="bg-cyan-600 hover:bg-cyan-700"
                        >
                          <Sparkles className="mr-2 h-4 w-4" />
                          View Repaired Code
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-slate-300">No issues found in this file.</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-700/50 pt-4">
                  <Label htmlFor="original-code" className="text-sm text-slate-300 mb-2 block">
                    Original Code
                  </Label>
                  <Textarea
                    id="original-code"
                    value={fileContent}
                    readOnly
                    className="font-mono text-sm bg-slate-800/30 border-slate-700 h-[200px] resize-none"
                  />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="repair" className="p-6">
            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-md p-4">
                <h3 className="text-base font-medium text-slate-300 mb-2 flex items-center">
                  <Sparkles className="h-4 w-4 text-cyan-500 mr-2" />
                  Repaired Code
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  The AI has repaired the issues in your code. Review the changes before saving.
                </p>

                <Textarea
                  value={repairedContent}
                  onChange={(e) => setRepairedContent(e.target.value)}
                  className="font-mono text-sm bg-slate-800/30 border-slate-700 h-[300px] resize-none"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="border-t border-slate-700/50 p-4 flex justify-between">
        <Button
          variant="outline"
          className="border-slate-700 bg-slate-800/50 hover:bg-slate-700/50"
          onClick={() => {
            setActiveTab("upload")
            setFileContent("")
            setFileName("")
            setFileType("")
            setIssues([])
            setRepairedContent("")
            setFiles([])
            if (fileInputRef.current) {
              fileInputRef.current.value = ""
            }
          }}
        >
          Cancel
        </Button>

        <div className="space-x-2">
          {activeTab === "analysis" && issues.length > 0 && !repairedContent && (
            <Button
              onClick={() => repairFile(fileContent, issues)}
              disabled={isRepairing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isRepairing ? (
                <>
                  <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                  Repairing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Repair Code
                </>
              )}
            </Button>
          )}

          {(activeTab === "repair" || (activeTab === "analysis" && (!issues.length || repairedContent))) && (
            <Button onClick={saveRepairedFile} className="bg-green-600 hover:bg-green-700">
              <Check className="mr-2 h-4 w-4" />
              Save File
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
