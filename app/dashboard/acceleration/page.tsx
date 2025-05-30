"use client"

import { TensorManager } from "@/components/tensor-manager"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { Suspense } from "react"

function TensorManagerWrapper() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardHeader>
            <CardTitle>Tensor Engine</CardTitle>
            <CardDescription>Loading tensor engine status...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      }
    >
      <TensorManager />
    </Suspense>
  )
}

export default function AccelerationPage() {
  const router = useRouter()

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" className="mr-2" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Hardware Acceleration</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <TensorManagerWrapper />

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>What is Tensor Acceleration?</CardTitle>
              <CardDescription>Optimize large language models for your hardware</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Tensor acceleration distributes model layers across your available hardware resources to maximize
                performance. This allows you to run larger models on less powerful hardware by intelligently using:
              </p>

              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    1
                  </span>
                  <span>
                    <strong>GPU Memory</strong> - Fastest but limited capacity
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    2
                  </span>
                  <span>
                    <strong>CPU Processing</strong> - Good balance of speed and availability
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    3
                  </span>
                  <span>
                    <strong>System RAM</strong> - Larger capacity but slower than GPU
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    4
                  </span>
                  <span>
                    <strong>NVME Storage</strong> - Largest capacity for offloading rarely used layers
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Benefits</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span>Run larger models on less powerful hardware</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span>Reduce memory usage by up to 70%</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span>Automatic hardware detection and optimization</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span>Improved inference speed through parallel processing</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span>Works with or without a dedicated GPU</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
