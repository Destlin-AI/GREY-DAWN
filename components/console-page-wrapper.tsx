"use client"

import dynamic from "next/dynamic"
import { Suspense } from "react"
import { Card, CardContent } from "@/components/ui/card"

// Dynamically import the ConsolePage component with SSR disabled
const ConsolePageContent = dynamic(() => import("@/components/console-page"), {
  ssr: false,
  loading: () => (
    <Card className="w-full h-[70vh]">
      <CardContent className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading console...</div>
      </CardContent>
    </Card>
  ),
})

export default function ConsolePageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConsolePageContent />
    </Suspense>
  )
}
