"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Download, Trash2, ArrowDownToLine } from "lucide-react"

interface LogViewerProps {
  logs: string[]
}

export function LogViewer({ logs }: LogViewerProps) {
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll && scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current
      scrollArea.scrollTop = scrollArea.scrollHeight
    }
  }, [logs, autoScroll])

  const handleClearLogs = () => {
    // This would typically call a function passed as a prop to clear logs
    console.log("Clear logs")
  }

  const handleDownloadLogs = () => {
    const logText = logs.join("\n")
    const blob = new Blob([logText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `tensor-server-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleClearLogs} className="gap-1">
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadLogs} className="gap-1">
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-900"
            />
            <span>Auto-scroll</span>
          </label>
          <Button variant="outline" size="sm" onClick={() => setAutoScroll(true)} className="gap-1">
            <ArrowDownToLine className="h-4 w-4" />
            Scroll to Bottom
          </Button>
        </div>
      </div>

      <div className="relative rounded-md border border-slate-800 bg-black">
        <ScrollArea className="h-[500px] w-full p-4 font-mono text-sm" ref={scrollAreaRef}>
          {logs.length === 0 ? (
            <div className="flex h-full items-center justify-center text-slate-500">No logs available</div>
          ) : (
            logs.map((log, index) => {
              // Parse log level if present
              let className = "text-slate-300"
              if (log.includes("[ERROR]") || log.includes("error:")) {
                className = "text-red-400"
              } else if (log.includes("[WARNING]") || log.includes("warning:")) {
                className = "text-amber-400"
              } else if (log.includes("[INFO]") || log.includes("info:")) {
                className = "text-blue-400"
              } else if (log.includes("[SUCCESS]") || log.includes("success:")) {
                className = "text-green-400"
              }

              return (
                <div key={index} className={`whitespace-pre-wrap py-0.5 ${className}`}>
                  {log}
                </div>
              )
            })
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
