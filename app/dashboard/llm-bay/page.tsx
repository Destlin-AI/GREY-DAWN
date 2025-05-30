import { IntegratedLLMTensorManager } from "@/components/integrated-llm-tensor-manager"

export default function LLMBayPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">LLM Bay</h1>
      <IntegratedLLMTensorManager />
    </div>
  )
}
