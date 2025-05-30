"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Cpu, HardDrive, MemoryStickIcon as Memory, Server, Activity, Gauge } from "lucide-react"

interface HardwareMonitorProps {
  status: any
}

export function HardwareMonitor({ status }: HardwareMonitorProps) {
  const [activeTab, setActiveTab] = useState("gpu")

  // Extract hardware info from status
  const hardware = status?.hardware || {
    gpu: { available: false, devices: [] },
    cpu: { cores: 0, threads: 0, usage: 0 },
    ram: { total_gb: 0, used_gb: 0, percent: 0 },
    nvme: { total_gb: 0, used_gb: 0, percent_used: 0 },
  }

  // Extract inference metrics if available
  const inference = status?.inference || {
    tokens_per_second: 0,
    batch_size: 1,
    context_used: 0,
    context_max: 2048,
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="gpu" onValueChange={setActiveTab} value={activeTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="gpu" className="data-[state=active]:bg-slate-800">
            GPU
          </TabsTrigger>
          <TabsTrigger value="cpu" className="data-[state=active]:bg-slate-800">
            CPU/RAM
          </TabsTrigger>
          <TabsTrigger value="storage" className="data-[state=active]:bg-slate-800">
            Storage
          </TabsTrigger>
          <TabsTrigger value="metrics" className="data-[state=active]:bg-slate-800">
            Metrics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gpu" className="pt-6">
          {hardware.gpu.available ? (
            <div className="space-y-6">
              {hardware.gpu.devices &&
                hardware.gpu.devices.map((device: any, index: number) => (
                  <div key={index} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="flex items-center gap-2 font-medium">
                        <Server className="h-5 w-5 text-purple-400" />
                        {device.name || `GPU ${index}`}
                      </h3>
                      <Badge variant="outline" className="border-purple-800 bg-purple-950 text-purple-400">
                        {formatMemory(device.total_memory || 0)}
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Memory Usage</span>
                          <span>
                            {formatMemory(device.memory?.[0]?.allocated_mb * 1024 * 1024 || 0)} /{" "}
                            {formatMemory(device.total_memory || 0)}
                          </span>
                        </div>
                        <Progress
                          value={calculatePercentage(
                            device.memory?.[0]?.allocated_mb || 0,
                            device.total_memory ? device.total_memory / (1024 * 1024) : 0,
                          )}
                          className="h-2"
                        />
                      </div>

                      {device.utilization && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>GPU Utilization</span>
                            <span>{device.utilization}%</span>
                          </div>
                          <Progress value={device.utilization || 0} className="h-2" />
                        </div>
                      )}

                      {device.temperature && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Temperature</span>
                            <span>{device.temperature}°C</span>
                          </div>
                          <Progress
                            value={(device.temperature / 100) * 100}
                            className="h-2"
                            indicatorClassName={
                              device.temperature > 80
                                ? "bg-red-500"
                                : device.temperature > 60
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                            }
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg bg-slate-900 p-3">
                        <div className="text-xs text-slate-500">Clock Speed</div>
                        <div className="text-lg font-semibold">{device.clock_mhz || "N/A"} MHz</div>
                      </div>
                      <div className="rounded-lg bg-slate-900 p-3">
                        <div className="text-xs text-slate-500">Power Draw</div>
                        <div className="text-lg font-semibold">{device.power_watts || "N/A"} W</div>
                      </div>
                    </div>
                  </div>
                ))}

              {status?.allocation && (
                <Card className="border-slate-800 bg-slate-900/50">
                  <CardContent className="p-4">
                    <h3 className="mb-3 font-medium">Layer Allocation</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>GPU Layers</span>
                        <span>{status.allocation.gpu || 0}</span>
                      </div>
                      <Progress
                        value={calculatePercentage(status.allocation.gpu || 0, status.allocation.total || 1)}
                        className="h-2 bg-slate-800"
                        indicatorClassName="bg-purple-500"
                      />

                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span>Active Layers</span>
                        <span>
                          {formatNumber(status.allocation.active || 0)} / {formatNumber(status.allocation.total || 0)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-slate-800">
              <div className="text-center">
                <h3 className="font-medium">No GPU Detected</h3>
                <p className="text-sm text-slate-500">The system does not detect any compatible GPUs</p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="cpu" className="space-y-6 pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-medium">
                <Cpu className="h-5 w-5 text-blue-400" />
                CPU
              </h3>
              <Badge variant="outline" className="border-blue-800 bg-blue-950 text-blue-400">
                {hardware.cpu.cores} cores / {hardware.cpu.threads} threads
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Utilization</span>
                <span>{hardware.cpu.percent || 0}%</span>
              </div>
              <Progress value={hardware.cpu.percent || 0} className="h-2" />
            </div>

            {hardware.cpu.frequency && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Clock Speed</span>
                  <span>{hardware.cpu.frequency} GHz</span>
                </div>
                <Progress value={(hardware.cpu.frequency / hardware.cpu.max_frequency) * 100} className="h-2" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-slate-900 p-3">
                <div className="text-xs text-slate-500">Architecture</div>
                <div className="text-lg font-semibold">{hardware.cpu.architecture || "x86_64"}</div>
              </div>
              <div className="rounded-lg bg-slate-900 p-3">
                <div className="text-xs text-slate-500">Temperature</div>
                <div className="text-lg font-semibold">{hardware.cpu.temperature || "N/A"}°C</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-medium">
                <Memory className="h-5 w-5 text-emerald-400" />
                RAM
              </h3>
              <Badge variant="outline" className="border-emerald-800 bg-emerald-950 text-emerald-400">
                {hardware.ram.total_gb || 0} GB
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Usage</span>
                <span>
                  {hardware.ram.used_gb || 0} GB / {hardware.ram.total_gb || 0} GB
                </span>
              </div>
              <Progress value={hardware.ram.percent || 0} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-slate-900 p-3">
                <div className="text-xs text-slate-500">Free Memory</div>
                <div className="text-lg font-semibold">
                  {(hardware.ram.total_gb - hardware.ram.used_gb).toFixed(1)} GB
                </div>
              </div>
              <div className="rounded-lg bg-slate-900 p-3">
                <div className="text-xs text-slate-500">Swap Usage</div>
                <div className="text-lg font-semibold">{hardware.ram.swap_used_gb || 0} GB</div>
              </div>
            </div>
          </div>

          {status?.allocation && (
            <Card className="border-slate-800 bg-slate-900/50">
              <CardContent className="p-4">
                <h3 className="mb-3 font-medium">CPU Layer Allocation</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>CPU Layers</span>
                    <span>{status.allocation.cpu || 0}</span>
                  </div>
                  <Progress
                    value={calculatePercentage(status.allocation.cpu || 0, status.allocation.total || 1)}
                    className="h-2 bg-slate-800"
                    indicatorClassName="bg-blue-500"
                  />

                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span>RAM Layers</span>
                    <span>{status.allocation.ram || 0}</span>
                  </div>
                  <Progress
                    value={calculatePercentage(status.allocation.ram || 0, status.allocation.total || 1)}
                    className="h-2 bg-slate-800"
                    indicatorClassName="bg-emerald-500"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="storage" className="space-y-6 pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-medium">
                <HardDrive className="h-5 w-5 text-amber-400" />
                NVME Storage
              </h3>
              <Badge variant="outline" className="border-amber-800 bg-amber-950 text-amber-400">
                {hardware.nvme.total_gb || 0} GB
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Usage</span>
                <span>
                  {hardware.nvme.used_gb || 0} GB / {hardware.nvme.total_gb || 0} GB
                </span>
              </div>
              <Progress value={hardware.nvme.percent_used || 0} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-slate-900 p-3">
                <div className="text-xs text-slate-500">Free Space</div>
                <div className="text-lg font-semibold">
                  {(hardware.nvme.total_gb - hardware.nvme.used_gb).toFixed(1)} GB
                </div>
              </div>
              <div className="rounded-lg bg-slate-900 p-3">
                <div className="text-xs text-slate-500">I/O Speed</div>
                <div className="text-lg font-semibold">{hardware.nvme.io_speed || "N/A"} MB/s</div>
              </div>
            </div>
          </div>

          {status?.allocation && (
            <Card className="border-slate-800 bg-slate-900/50">
              <CardContent className="p-4">
                <h3 className="mb-3 font-medium">NVME Layer Allocation</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>NVME Layers</span>
                    <span>{status.allocation.nvme || 0}</span>
                  </div>
                  <Progress
                    value={calculatePercentage(status.allocation.nvme || 0, status.allocation.total || 1)}
                    className="h-2 bg-slate-800"
                    indicatorClassName="bg-amber-500"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-medium">
              <Activity className="h-5 w-5 text-rose-400" />
              I/O Activity
            </h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Read Speed</span>
                <span>{hardware.nvme?.read_speed || 0} MB/s</span>
              </div>
              <Progress value={calculatePercentage(hardware.nvme?.read_speed || 0, 3000)} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Write Speed</span>
                <span>{hardware.nvme?.write_speed || 0} MB/s</span>
              </div>
              <Progress value={calculatePercentage(hardware.nvme?.write_speed || 0, 3000)} className="h-2" />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="pt-6">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-slate-900 p-4">
                <div className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-blue-400" />
                  <div className="text-sm font-medium">Tokens per Second</div>
                </div>
                <div className="mt-2 text-3xl font-bold">{formatNumber(inference.tokens_per_second || 0)}</div>
              </div>

              <div className="rounded-lg bg-slate-900 p-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-400" />
                  <div className="text-sm font-medium">Batch Size</div>
                </div>
                <div className="mt-2 text-3xl font-bold">{inference.batch_size || 1}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Context Usage</span>
                <span>
                  {formatNumber(inference.context_used || 0)} / {formatNumber(inference.context_max || 0)} tokens
                </span>
              </div>
              <Progress
                value={calculatePercentage(inference.context_used || 0, inference.context_max || 1)}
                className="h-2"
              />
            </div>

            <Card className="border-slate-800 bg-slate-900/50">
              <CardContent className="p-4">
                <h3 className="mb-3 font-medium">Performance Metrics</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Memory Efficiency</span>
                    <Badge variant="outline" className="border-blue-800 bg-blue-950 text-blue-400">
                      {status?.optimization?.memory_efficiency || "N/A"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Throughput</span>
                    <Badge variant="outline" className="border-emerald-800 bg-emerald-950 text-emerald-400">
                      {status?.optimization?.throughput || "N/A"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Latency</span>
                    <Badge variant="outline" className="border-amber-800 bg-amber-950 text-amber-400">
                      {status?.optimization?.latency || "N/A"} ms
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Quantization</span>
                    <Badge variant="outline" className="border-purple-800 bg-purple-950 text-purple-400">
                      {status?.optimization?.quantization || "N/A"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0
  return (value / total) * 100
}

function formatMemory(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(2)}K`
  }
  return num.toString()
}
