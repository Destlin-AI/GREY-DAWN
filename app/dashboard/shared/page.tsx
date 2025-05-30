"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ProtectedRoute } from "@/components/protected-route"
import { ToastProvider, useToast } from "@/components/ui/use-toast"
import { Share2, RefreshCw, Trash2, Copy, Lock, Unlock, Eye, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Suspense } from "react"

interface SharedFile {
  id: string
  originalFilename: string
  shareUrl: string
  createdAt: string
  expiresAt?: string
  accessCount: number
  isPasswordProtected: boolean
}

// Separate component that uses toast - only renders on client
function SharedFilesContent() {
  const { toast } = useToast()
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  // Client-side only switch
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient) {
      fetchSharedFiles()
    }
  }, [isClient])

  const fetchSharedFiles = async () => {
    if (!isClient) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/share")
      if (response.ok) {
        const data = await response.json()
        setSharedFiles(data)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch shared files",
        })
      }
    } catch (error) {
      console.error("Error fetching shared files:", error)
      toast({
        title: "Error",
        description: "Failed to fetch shared files",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyLink = (id: string) => {
    if (!isClient) return

    const shareUrl = `${window.location.origin}/shared/${id}`
    navigator.clipboard.writeText(shareUrl)
    toast({
      title: "Link copied",
      description: "Share link copied to clipboard",
    })
  }

  const handleDeleteFile = async () => {
    if (!fileToDelete || !isClient) return

    try {
      const response = await fetch(`/api/share/${fileToDelete}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setSharedFiles((prev) => prev.filter((file) => file.id !== fileToDelete))
        toast({
          title: "Share link deleted",
          description: "The share link has been deleted successfully.",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to delete share link",
        })
      }
    } catch (error) {
      console.error("Error deleting share link:", error)
      toast({
        title: "Error",
        description: "Failed to delete share link",
      })
    } finally {
      setFileToDelete(null)
      setDeleteDialogOpen(false)
    }
  }

  const confirmDelete = (id: string) => {
    setFileToDelete(id)
    setDeleteDialogOpen(true)
  }

  const isExpired = (expiresAt?: string): boolean => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  // Show loading state during SSR and initial client render
  if (!isClient) {
    return (
      <div className="container mx-auto p-4 relative z-10">
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="border-b border-slate-700/50 pb-3">
            <CardTitle className="text-slate-100 flex items-center">
              <Share2 className="mr-2 h-5 w-5 text-cyan-500" />
              Shared Files
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 text-cyan-500 animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 relative z-10">
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="border-b border-slate-700/50 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-100 flex items-center">
              <Share2 className="mr-2 h-5 w-5 text-cyan-500" />
              Shared Files
            </CardTitle>
            <Button
              onClick={fetchSharedFiles}
              variant="outline"
              className="bg-slate-800/50 border-slate-700 text-slate-300"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 text-cyan-500 animate-spin" />
            </div>
          ) : sharedFiles.length === 0 ? (
            <div className="text-center py-12">
              <Share2 className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-300 mb-2">No Shared Files</h3>
              <p className="text-slate-400 max-w-md mx-auto">
                You haven't shared any files yet. Go to the Files page and use the share button to create shareable
                links.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400">File</TableHead>
                    <TableHead className="text-slate-400">Created</TableHead>
                    <TableHead className="text-slate-400">Expires</TableHead>
                    <TableHead className="text-slate-400">Views</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-right text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sharedFiles.map((file) => (
                    <TableRow key={file.id} className="border-slate-700/50 hover:bg-slate-800/30">
                      <TableCell className="font-medium text-slate-300">{file.originalFilename}</TableCell>
                      <TableCell className="text-slate-400">
                        {format(new Date(file.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {file.expiresAt ? (
                          <span className={isExpired(file.expiresAt) ? "text-red-400" : "text-slate-400"}>
                            {format(new Date(file.expiresAt), "MMM d, yyyy")}
                          </span>
                        ) : (
                          <span className="text-slate-500">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-400">{file.accessCount}</TableCell>
                      <TableCell>
                        {isExpired(file.expiresAt) ? (
                          <Badge variant="outline" className="bg-red-900/20 text-red-400 border-red-500/30">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Expired
                          </Badge>
                        ) : file.isPasswordProtected ? (
                          <Badge variant="outline" className="bg-amber-900/20 text-amber-400 border-amber-500/30">
                            <Lock className="h-3 w-3 mr-1" />
                            Protected
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-500/30">
                            <Unlock className="h-3 w-3 mr-1" />
                            Public
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-cyan-400"
                            onClick={() => handleCopyLink(file.id)}
                          >
                            <Copy className="h-4 w-4" />
                            <span className="sr-only">Copy Link</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-cyan-400"
                            onClick={() => window.open(`/shared/${file.id}`, "_blank")}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                            onClick={() => confirmDelete(file.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Share Link</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete this share link? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFile} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Main component with proper error boundaries and SSR handling
export default function SharedFilesPage() {
  return (
    <ProtectedRoute>
      <ToastProvider>
        <Suspense
          fallback={
            <div className="container mx-auto p-4 relative z-10">
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="border-b border-slate-700/50 pb-3">
                  <CardTitle className="text-slate-100 flex items-center">
                    <Share2 className="mr-2 h-5 w-5 text-cyan-500" />
                    Shared Files
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex justify-center py-8">
                    <RefreshCw className="h-8 w-8 text-cyan-500 animate-spin" />
                  </div>
                </CardContent>
              </Card>
            </div>
          }
        >
          <SharedFilesContent />
        </Suspense>
      </ToastProvider>
    </ProtectedRoute>
  )
}
