"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { CalendarIcon, Copy, Lock } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface ShareFileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filename: string
}

export function ShareFileDialog({ open, onOpenChange, filename }: ShareFileDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [isPasswordProtected, setIsPasswordProtected] = useState(false)
  const [password, setPassword] = useState("")
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined)
  const [showCalendar, setShowCalendar] = useState(false)

  const handleCreateShareLink = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalFilename: filename,
          expiresAt: expiryDate?.toISOString(),
          isPasswordProtected,
          password: isPasswordProtected ? password : undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create share link")
      }

      const data = await response.json()
      const fullShareUrl = `${window.location.origin}/shared/${data.id}`
      setShareLink(fullShareUrl)

      toast({
        title: "Share link created",
        description: "The share link has been created successfully.",
      })
    } catch (error) {
      console.error("Error creating share link:", error)
      toast({
        title: "Error",
        description: "Failed to create share link. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink)
      toast({
        title: "Link copied",
        description: "Share link copied to clipboard",
      })
    }
  }

  const resetForm = () => {
    setShareLink(null)
    setIsPasswordProtected(false)
    setPassword("")
    setExpiryDate(undefined)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) resetForm()
        onOpenChange(newOpen)
      }}
    >
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle>Share File</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-slate-400">
            Sharing <span className="font-semibold text-slate-300">{filename}</span>
          </div>

          {!shareLink ? (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="password-protection">Password Protection</Label>
                    <div className="text-xs text-slate-500">Require a password to access the file</div>
                  </div>
                  <Switch
                    id="password-protection"
                    checked={isPasswordProtected}
                    onCheckedChange={setIsPasswordProtected}
                  />
                </div>

                {isPasswordProtected && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type="text"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-slate-100 pr-10"
                        placeholder="Enter a password"
                      />
                      <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Expiration Date (Optional)</Label>
                  <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-slate-800 border-slate-700 text-slate-100",
                          !expiryDate && "text-slate-500",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expiryDate ? format(expiryDate, "PPP") : "Select expiration date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-700">
                      <Calendar
                        mode="single"
                        selected={expiryDate}
                        onSelect={(date) => {
                          setExpiryDate(date)
                          setShowCalendar(false)
                        }}
                        initialFocus
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                  {expiryDate && (
                    <Button
                      variant="link"
                      className="text-xs text-cyan-400 p-0 h-auto"
                      onClick={() => setExpiryDate(undefined)}
                    >
                      Clear date
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Share Link</Label>
                <div className="flex">
                  <Input
                    readOnly
                    value={shareLink}
                    className="bg-slate-800 border-slate-700 text-slate-100 rounded-r-none"
                  />
                  <Button className="rounded-l-none bg-cyan-600 hover:bg-cyan-700" onClick={handleCopyLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center text-slate-400">
                  <Lock className="h-4 w-4 mr-2" />
                  {isPasswordProtected ? (
                    <span>
                      Password protected: <span className="text-cyan-400">{password}</span>
                    </span>
                  ) : (
                    <span>No password protection</span>
                  )}
                </div>

                {expiryDate && (
                  <div className="flex items-center text-slate-400">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <span>
                      Expires on: <span className="text-cyan-400">{format(expiryDate, "PPP")}</span>
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-slate-800/50 rounded-md p-3 text-sm text-slate-400 border border-slate-700/50">
                <p>Anyone with this link can access the file{isPasswordProtected ? " (with the password)" : ""}.</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {!shareLink ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-700 text-slate-300">
                Cancel
              </Button>
              <Button
                onClick={handleCreateShareLink}
                className="bg-cyan-600 hover:bg-cyan-700"
                disabled={isLoading || (isPasswordProtected && !password)}
              >
                {isLoading ? "Creating..." : "Create Share Link"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setShareLink(null)} className="border-slate-700 text-slate-300">
                Create Another
              </Button>
              <Button onClick={() => onOpenChange(false)} className="bg-cyan-600 hover:bg-cyan-700">
                Done
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
