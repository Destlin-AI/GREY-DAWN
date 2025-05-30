"use client"

import { QwenTensorManager } from "@/components/qwen-tensor-manager"
import { ProtectedRoute } from "@/components/protected-route"

export default function QwenTensorPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Qwen2.5-7B-Instruct-1M Tensor Engine</h1>
        <p className="text-gray-500 mb-6">
          Specialized tensor engine for maximizing context length up to 1M tokens without performance degradation
        </p>
        <QwenTensorManager />
      </div>
    </ProtectedRoute>
  )
}
