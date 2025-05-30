"use client"

import { useState } from "react"
import { Download, FileJson, FileSpreadsheet } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import {
  useSystemMetrics,
  useProcesses,
  useStorage,
  useAlerts,
  useMessages,
  usePerformanceData,
} from "@/hooks/use-data"
import {
  exportSystemMetrics,
  exportProcesses,
  exportStorage,
  exportAlerts,
  exportMessages,
  exportPerformanceData,
  exportAllData,
} from "@/lib/export"

export function DataExport() {
  const [open, setOpen] = useState(false)
  const [exportType, setExportType] = useState<string>("all")
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("json")

  const { metrics } = useSystemMetrics()
  const { processes } = useProcesses()
  const { storage } = useStorage()
  const { alerts } = useAlerts()
  const { messages } = useMessages()
  const { performanceData } = usePerformanceData()

  const handleExport = () => {
    switch (exportType) {
      case "metrics":
        exportSystemMetrics(metrics, exportFormat)
        break
      case "processes":
        exportProcesses(processes, exportFormat)
        break
      case "storage":
        exportStorage(storage, exportFormat)
        break
      case "alerts":
        exportAlerts(alerts, exportFormat)
        break
      case "messages":
        exportMessages(messages, exportFormat)
        break
      case "performance":
        exportPerformanceData(performanceData, exportFormat)
        break
      case "all":
        exportAllData(
          {
            metrics,
            processes,
            storage,
            alerts,
            messages,
            performanceData,
          },
          exportFormat,
        )
        break
    }
    setOpen(false)
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Download className="mr-2 h-4 w-4" />
        Export Data
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Export System Data</DialogTitle>
            <DialogDescription>Choose what data you want to export and in which format.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="export-type">Data to Export</Label>
              <RadioGroup
                id="export-type"
                value={exportType}
                onValueChange={setExportType}
                className="grid grid-cols-2 gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all">All Data</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="metrics" id="metrics" />
                  <Label htmlFor="metrics">System Metrics</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="processes" id="processes" />
                  <Label htmlFor="processes">Processes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="storage" id="storage" />
                  <Label htmlFor="storage">Storage</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="alerts" id="alerts" />
                  <Label htmlFor="alerts">Alerts</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="messages" id="messages" />
                  <Label htmlFor="messages">Messages</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="performance" id="performance" />
                  <Label htmlFor="performance">Performance</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="export-format">Export Format</Label>
              <RadioGroup
                id="export-format"
                value={exportFormat}
                onValueChange={(value) => setExportFormat(value as "csv" | "json")}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="json" id="json" />
                  <Label htmlFor="json" className="flex items-center">
                    <FileJson className="mr-1 h-4 w-4" />
                    JSON
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="csv" id="csv" />
                  <Label htmlFor="csv" className="flex items-center">
                    <FileSpreadsheet className="mr-1 h-4 w-4" />
                    CSV
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
