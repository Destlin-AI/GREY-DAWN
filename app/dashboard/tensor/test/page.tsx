import { WebGPUTensorTest } from "@/components/webgpu-tensor-test"

export const metadata = {
  title: "WebGPU Tensor Engine Test",
  description: "Test the WebGPU tensor engine functionality",
}

export default function TensorTestPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">WebGPU Tensor Engine Test</h1>
          <p className="text-muted-foreground">
            Run comprehensive tests to verify the WebGPU tensor engine functionality
          </p>
        </div>

        <WebGPUTensorTest />
      </div>
    </div>
  )
}
