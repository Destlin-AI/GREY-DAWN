"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface FileAnalysisPanelProps {
  fileContent: string
  fileType: string
  onSuggestionApply?: (newContent: string) => void
}

export function FileAnalysisPanel({ fileContent, fileType, onSuggestionApply }: FileAnalysisPanelProps) {
  const { toast } = useToast()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [currentSuggestion, setCurrentSuggestion] = useState(0)
  const [rawResponse, setRawResponse] = useState("")

  const analyzeFile = async () => {
    setIsAnalyzing(true)
    try {
      const response = await fetch("/api/analyze-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: fileContent, fileType }),
      })

      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions || [])
      } else {
        console.error("Analysis failed")
      }
    } catch (error) {
      console.error("Error analyzing file:", error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const nextSuggestion = () => {
    setCurrentSuggestion((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
  }

  return (
    <Card className="p-4 mt-4">
      <h3 className="font-medium mb-2 flex items-center">
        <Sparkles className="h-4 w-4 mr-2 text-yellow-500" />
        AI File Analysis
      </h3>

      {suggestions.length > 0 ? (
        <div className="space-y-3">
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm">{suggestions[currentSuggestion]}</div>
          <div className="flex justify-between">
            <Button variant="outline" size="sm" onClick={nextSuggestion}>
              Next Suggestion
            </Button>
            <Button size="sm" onClick={() => onSuggestionApply(suggestions[currentSuggestion])}>
              Apply
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={analyzeFile} disabled={isAnalyzing}>
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Suggestions
            </>
          )}
        </Button>
      )}
    </Card>
  )
}
