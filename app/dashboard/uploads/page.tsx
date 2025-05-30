"use client"

export const dynamic = "force-dynamic"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import DragAndDropUploader from "@/components/drag-and-drop-uploader"
import { ProtectedRoute } from "@/components/protected-route"
import { ArrowLeft, Upload } from "lucide-react"
import { ToastProvider } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function UploadsPage() {
  const router = useRouter()

  return (
    <ProtectedRoute>
      <ToastProvider>
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
                    <Upload className="mr-2 h-5 w-5 text-cyan-500" />
                    File Uploader
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <DragAndDropUploader />
            </CardContent>
          </Card>
        </div>
      </ToastProvider>
    </ProtectedRoute>
  )
}
