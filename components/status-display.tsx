"use client"

import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react"

interface StatusDisplayProps {
  status: any
  isLoading: boolean
}

export function StatusDisplay({ status, isLoading }: StatusDisplayProps) {
  const isRunning = status?.running || false
  const hasModel = status?.model?.name || false
  const hasWarnings = status?.warnings && status.warnings.length > 0
  const hasErrors = status?.errors && status.errors.length > 0

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            {isLoading ? (
              <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-300">
                <Clock className="mr-1 h-3 w-3 animate-pulse" />
                Updating...
              </Badge>
            ) : isRunning ? (
              <Badge variant="outline" className="border-green-800 bg-green-950 text-green-400">
                <CheckCircle className="mr-1 h-3 w-3" />
                Running
              </Badge>
            ) : (
              <Badge variant="outline" className="border-red-800 bg-red-950 text-red-400">
                <XCircle className="mr-1 h-3 w-3" />
                Stopped
              </Badge>
            )}

            {hasWarnings && (
              <Badge variant="outline" className="border-amber-800 bg-amber-950 text-amber-400">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Warnings
              </Badge>
            )}

            {hasErrors && (
              <Badge variant="outline" className="border-red-800 bg-red-950 text-red-400">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Errors
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-2 p-1">
            <p className="font-medium">Server Status</p>
            <div className="text-sm">
              {isRunning ? (
                <p className="text-green-400">Server is running</p>
              ) : (
                <p className="text-red-400">Server is stopped</p>
              )}
              {hasModel && <p>Model: {status.model.name}</p>}
              {status?.uptime && <p>Uptime: {formatUptime(status.uptime)}</p>}
              {hasWarnings && <p className="text-amber-400">{status.warnings.length} warnings</p>}
              {hasErrors && <p className="text-red-400">{status.errors.length} errors</p>}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`
}
