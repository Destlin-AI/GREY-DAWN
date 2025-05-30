"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, Lock, FileText, AlertCircle, Clock } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

interface SharedFile {
  id: string
  originalFilename: string
  shareUrl: string
  createdAt: string
  expiresAt?: string
  accessCount: number
  isPasswordProtected: boolean
}

interface FileContent {
  content: string
  filename: string
}

export default function SharedFilePage() {
  const params = useParams()
  const id = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sharedFile, setSharedFile] = useState<SharedFile | null>(null)
  const [fileContent, setFileContent] = useState<FileContent | null>(null)
  const [password, setPassword] = useState("")
  const [isPasswordError, setIsPasswordError] = useState(false)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const fetchSharedFile = async () => {
      try {
        const response = await fetch(`/api/share/${id}`)

        if (!response.ok) {
          if (response.status === 404) {
            setError("The shared file you're looking for doesn't exist.")
          } else {
            setError("Failed to load the shared file.")
          }
          setIsLoading(false)
          return
        }

        const data = await response.json()
        setSharedFile(data)

        // Check if file is expired
        if (data.expiresAt) {
          const expiryDate = new Date(data.expiresAt)
          if (expiryDate < new Date()) {
            setIsExpired(true)
            setError("This shared link has expired.")
            setIsLoading(false)
            return
          }
        }

        // If no password protection, fetch content immediately
        if (!data.isPasswordProtected) {
          await fetchFileContent()
        } else {
          setIsLoading(false)
        }
      } catch (error) {
        console.error("Error fetching shared file:", error)
        setError("An error occurred while loading the shared file.")
        setIsLoading(false)
      }
    }

    fetchSharedFile()
  }, [id])

  const fetchFileContent = async (passwordParam?: string) => {
    setIsLoading(true)
    setIsPasswordError(false)

    try {
      const url = `/api/share/${id}/content${passwordParam ? `?password=${passwordParam}` : ""}`
      const response = await fetch(url)

      if (!response.ok) {
        if (response.status === 401) {
          setIsPasswordError(true)
        } else if (response.status === 410) {
          setIsExpired(true)
          setError("This shared link has expired.")
        } else {
          setError("Failed to load the file content.")
        }
        setIsLoading(false)
        return
      }

      const data = await response.json()
      setFileContent(data)
    } catch (error) {
      console.error("Error fetching file content:", error)
      setError("An error occurred while loading the file content.")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchFileContent(password)
  }

  const handleDownload = () => {
    if (!fileContent) return

    const blob = new Blob([fileContent.content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileContent.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()

    switch (extension) {
      case "js":
      case "jsx":
      case "ts":
      case "tsx":
        return <Badge className="bg-yellow-600 text-white">JS/TS</Badge>
      case "py":
        return <Badge className="bg-blue-600 text-white">Python</Badge>
      case "json":
        return <Badge className="bg-orange-600 text-white">JSON</Badge>
      case "yaml":
      case "yml":
        return <Badge className="bg-green-600 text-white">YAML</Badge>
      case "md":
        return <Badge className="bg-purple-600 text-white">MD</Badge>
      case "html":
        return <Badge className="bg-red-600 text-white">HTML</Badge>
      case "css":
      case "scss":
        return <Badge className="bg-blue-400 text-white">CSS</Badge>
      default:
        return <Badge className="bg-slate-600 text-white">TXT</Badge>
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl bg-slate-900/50 border-slate-700/50 backdrop-blur-sm text-slate-100">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4 opacity-80" />
              <h2 className="text-xl font-semibold mb-2">{isExpired ? "Link Expired" : "File Not Available"}</h2>
              <p className="text-slate-400">{error}</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300"
              onClick={() => (window.location.href = "/dashboard")}
            >
              Return to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-slate-900/50 border-slate-700/50 backdrop-blur-sm text-slate-100">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 text-cyan-500 mr-2" />
            Shared File
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4 bg-slate-800" />
              <Skeleton className="h-64 w-full bg-slate-800" />
            </div>
          ) : sharedFile?.isPasswordProtected && !fileContent ? (
            <div className="py-8">
              <div className="flex flex-col items-center justify-center mb-6">
                <Lock className="h-16 w-16 text-cyan-500 mb-4 opacity-80" />
                <h2 className="text-xl font-semibold mb-2">Password Protected</h2>
                <p className="text-slate-400 text-center">
                  This file is password protected. Please enter the password to view it.
                </p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md mx-auto">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`bg-slate-800 border-slate-700 text-slate-100 ${
                      isPasswordError ? "border-red-500 focus:ring-red-500" : ""
                    }`}
                    placeholder="Enter password"
                    autoFocus
                  />
                  {isPasswordError && <p className="text-sm text-red-500">Incorrect password. Please try again.</p>}
                </div>
                <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700">
                  Unlock File
                </Button>
              </form>
            </div>
          ) : fileContent ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {getFileIcon(fileContent.filename)}
                  <h2 className="text-lg font-semibold ml-2">{fileContent.filename}</h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>

              <div className="bg-slate-800/50 rounded-md border border-slate-700/50 p-4">
                <pre className="overflow-auto max-h-96 text-sm text-slate-300 whitespace-pre-wrap">
                  {fileContent.content}
                </pre>
              </div>

              {sharedFile?.expiresAt && (
                <div className="flex items-center text-sm text-slate-400">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>
                    This link expires on {new Date(sharedFile.expiresAt).toLocaleDateString()} at{" "}
                    {new Date(sharedFile.expiresAt).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-xs text-slate-500">
            {sharedFile && `Viewed ${sharedFile.accessCount} ${sharedFile.accessCount === 1 ? "time" : "times"}`}
          </div>
          <Button
            variant="ghost"
            className="text-slate-400 hover:text-slate-100"
            onClick={() => (window.location.href = "/dashboard")}
          >
            Return to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
