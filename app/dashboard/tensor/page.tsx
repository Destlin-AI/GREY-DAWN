import { WebGPUTensorManager } from "@/components/webgpu-tensor-manager"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const metadata = {
  title: "WebGPU Tensor Acceleration",
  description: "Hardware-accelerated tensor operations for LLMs",
}

export default function TensorPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">WebGPU Tensor Acceleration</h1>
          <p className="text-muted-foreground">
            Optimize model performance by distributing layers across GPU, CPU, and storage
          </p>
        </div>

        <Tabs defaultValue="manager">
          <TabsList>
            <TabsTrigger value="manager">Tensor Manager</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="manager" className="mt-4">
            <WebGPUTensorManager />
          </TabsContent>

          <TabsContent value="about" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>About WebGPU Tensor Acceleration</CardTitle>
                <CardDescription>
                  How the tensor acceleration system works to optimize model performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">What is WebGPU Tensor Acceleration?</h3>
                  <p className="text-sm text-muted-foreground">
                    WebGPU Tensor Acceleration is a system that optimizes the performance of large language models by
                    intelligently distributing model layers across different hardware components based on their speed
                    and capacity, using the WebGPU API to leverage your RTX 3070 GPU.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">How It Works</h3>
                  <p className="text-sm text-muted-foreground">
                    Large language models are composed of many transformer layers. The tensor acceleration system:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                    <li>Detects available hardware (GPU, CPU, storage)</li>
                    <li>Analyzes model size and requirements</li>
                    <li>Distributes layers optimally across hardware</li>
                    <li>Places critical layers on faster hardware</li>
                    <li>Offloads less critical layers to slower storage</li>
                    <li>Uses WebGPU for hardware-accelerated tensor operations</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Benefits</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                    <li>Run larger models on less powerful hardware</li>
                    <li>Improve inference speed by optimizing layer placement</li>
                    <li>Reduce memory usage through quantization and compression</li>
                    <li>Enable running models that wouldn't otherwise fit in memory</li>
                    <li>Automatically adapt to available hardware resources</li>
                    <li>Leverage your RTX 3070 for maximum performance</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
