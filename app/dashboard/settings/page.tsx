"use client"

import { useEffect } from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProtectedRoute } from "@/components/protected-route"
import { ArrowLeft, Settings, Save, Moon, Sun, Bell, Shield, Globe, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const router = useRouter()
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark")
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [securityLevel, setSecurityLevel] = useState(80)
  const [language, setLanguage] = useState("en-US")
  const [username, setUsername] = useState("Admin")
  const [email, setEmail] = useState("admin@nexos.com")
  const [isClient, setIsClient] = useState(false)
  const [toastReady, setToastReady] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setIsClient(true)
    setToastReady(true)
  }, [])

  const handleSave = () => {
    if (toastReady) {
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
      })
    }
  }

  return (
    <div className="w-full">
      {isClient ? (
        <div className="flex flex-col space-y-4">
          <ProtectedRoute>
            <div className="container mx-auto p-4 relative z-10">
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="border-b border-slate-700/50 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mr-2 text-slate-400 hover:text-slate-100"
                        onClick={() => router.push("/dashboard")}
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <CardTitle className="text-slate-100 flex items-center">
                        <Settings className="mr-2 h-5 w-5 text-cyan-500" />
                        System Settings
                      </CardTitle>
                    </div>
                    <Button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700">
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <Tabs defaultValue="appearance" className="w-full">
                    <TabsList className="grid grid-cols-5 mb-8">
                      <TabsTrigger
                        value="appearance"
                        className="data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400"
                      >
                        <Sun className="mr-2 h-4 w-4" />
                        Appearance
                      </TabsTrigger>
                      <TabsTrigger
                        value="notifications"
                        className="data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400"
                      >
                        <Bell className="mr-2 h-4 w-4" />
                        Notifications
                      </TabsTrigger>
                      <TabsTrigger
                        value="security"
                        className="data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400"
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Security
                      </TabsTrigger>
                      <TabsTrigger
                        value="language"
                        className="data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400"
                      >
                        <Globe className="mr-2 h-4 w-4" />
                        Language
                      </TabsTrigger>
                      <TabsTrigger
                        value="profile"
                        className="data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400"
                      >
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="appearance" className="space-y-6">
                      <div className="grid gap-6">
                        <div className="space-y-2">
                          <h3 className="text-lg font-medium text-slate-100">Theme</h3>
                          <p className="text-sm text-slate-400">Select your preferred theme for the dashboard.</p>
                          <div className="grid grid-cols-3 gap-4 pt-2">
                            <div
                              className={`flex flex-col items-center justify-center p-4 rounded-lg border ${theme === "dark" ? "border-cyan-500 bg-slate-800" : "border-slate-700 bg-slate-800/50"} cursor-pointer`}
                              onClick={() => setTheme("dark")}
                            >
                              <Moon className="h-8 w-8 mb-2 text-slate-300" />
                              <span className="text-sm font-medium text-slate-300">Dark</span>
                            </div>
                            <div
                              className={`flex flex-col items-center justify-center p-4 rounded-lg border ${theme === "light" ? "border-cyan-500 bg-slate-800" : "border-slate-700 bg-slate-800/50"} cursor-pointer`}
                              onClick={() => setTheme("light")}
                            >
                              <Sun className="h-8 w-8 mb-2 text-slate-300" />
                              <span className="text-sm font-medium text-slate-300">Light</span>
                            </div>
                            <div
                              className={`flex flex-col items-center justify-center p-4 rounded-lg border ${theme === "system" ? "border-cyan-500 bg-slate-800" : "border-slate-700 bg-slate-800/50"} cursor-pointer`}
                              onClick={() => setTheme("system")}
                            >
                              <div className="flex mb-2">
                                <Moon className="h-8 w-8 text-slate-300" />
                                <Sun className="h-8 w-8 text-slate-300" />
                              </div>
                              <span className="text-sm font-medium text-slate-300">System</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-lg font-medium text-slate-100">Accent Color</h3>
                          <p className="text-sm text-slate-400">Choose your preferred accent color.</p>
                          <div className="grid grid-cols-6 gap-2 pt-2">
                            {["cyan", "blue", "purple", "green", "amber", "red"].map((color) => (
                              <div
                                key={color}
                                className={`h-10 rounded-md cursor-pointer border-2 ${color === "cyan" ? "border-white" : "border-transparent"} bg-${color}-500`}
                                style={{ backgroundColor: `var(--${color}-500, #0ea5e9)` }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="notifications" className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-base font-medium text-slate-100">Enable Notifications</h3>
                            <p className="text-sm text-slate-400">Receive system alerts and notifications</p>
                          </div>
                          <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-700/50">
                          <h3 className="text-base font-medium text-slate-100">Notification Types</h3>

                          <div className="flex items-center justify-between">
                            <Label htmlFor="security-alerts" className="text-slate-300">
                              Security Alerts
                            </Label>
                            <Switch id="security-alerts" defaultChecked />
                          </div>

                          <div className="flex items-center justify-between">
                            <Label htmlFor="system-updates" className="text-slate-300">
                              System Updates
                            </Label>
                            <Switch id="system-updates" defaultChecked />
                          </div>

                          <div className="flex items-center justify-between">
                            <Label htmlFor="performance-alerts" className="text-slate-300">
                              Performance Alerts
                            </Label>
                            <Switch id="performance-alerts" defaultChecked />
                          </div>

                          <div className="flex items-center justify-between">
                            <Label htmlFor="user-messages" className="text-slate-300">
                              User Messages
                            </Label>
                            <Switch id="user-messages" defaultChecked />
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="security" className="space-y-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h3 className="text-lg font-medium text-slate-100">Security Level</h3>
                          <p className="text-sm text-slate-400">Adjust the system security level.</p>
                          <div className="pt-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-slate-400">Standard</span>
                              <span className="text-sm text-slate-400">Maximum</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <Slider
                                value={[securityLevel]}
                                onValueChange={(value) => setSecurityLevel(value[0])}
                                max={100}
                                step={10}
                                className="flex-1"
                              />
                              <span className="w-12 text-right text-sm font-medium text-cyan-400">
                                {securityLevel}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 pt-4 border-t border-slate-700/50">
                          <h3 className="text-lg font-medium text-slate-100">Security Features</h3>

                          <div className="flex items-center justify-between py-2">
                            <div>
                              <h4 className="text-base font-medium text-slate-300">Two-Factor Authentication</h4>
                              <p className="text-sm text-slate-400">Add an extra layer of security</p>
                            </div>
                            <Switch defaultChecked />
                          </div>

                          <div className="flex items-center justify-between py-2">
                            <div>
                              <h4 className="text-base font-medium text-slate-300">Firewall</h4>
                              <p className="text-sm text-slate-400">Block unauthorized access</p>
                            </div>
                            <Switch defaultChecked />
                          </div>

                          <div className="flex items-center justify-between py-2">
                            <div>
                              <h4 className="text-base font-medium text-slate-300">Data Encryption</h4>
                              <p className="text-sm text-slate-400">Encrypt all stored data</p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="language" className="space-y-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h3 className="text-lg font-medium text-slate-100">Interface Language</h3>
                          <p className="text-sm text-slate-400">Select your preferred language for the interface.</p>
                          <div className="pt-2">
                            <Select value={language} onValueChange={setLanguage}>
                              <SelectTrigger className="w-full bg-slate-800 border-slate-700">
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="en-US">English (US)</SelectItem>
                                <SelectItem value="en-GB">English (UK)</SelectItem>
                                <SelectItem value="fr-FR">French</SelectItem>
                                <SelectItem value="de-DE">German</SelectItem>
                                <SelectItem value="ja-JP">Japanese</SelectItem>
                                <SelectItem value="zh-CN">Chinese (Simplified)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2 pt-4 border-t border-slate-700/50">
                          <h3 className="text-lg font-medium text-slate-100">Date & Time Format</h3>
                          <div className="grid grid-cols-2 gap-4 pt-2">
                            <div>
                              <Label htmlFor="date-format" className="text-slate-300 mb-2 block">
                                Date Format
                              </Label>
                              <Select defaultValue="MM/DD/YYYY">
                                <SelectTrigger id="date-format" className="w-full bg-slate-800 border-slate-700">
                                  <SelectValue placeholder="Select format" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="time-format" className="text-slate-300 mb-2 block">
                                Time Format
                              </Label>
                              <Select defaultValue="24h">
                                <SelectTrigger id="time-format" className="w-full bg-slate-800 border-slate-700">
                                  <SelectValue placeholder="Select format" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                  <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                                  <SelectItem value="24h">24-hour</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="profile" className="space-y-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h3 className="text-lg font-medium text-slate-100">User Information</h3>
                          <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="space-y-2">
                              <Label htmlFor="username" className="text-slate-300">
                                Username
                              </Label>
                              <Input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="bg-slate-800 border-slate-700 text-slate-100"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="email" className="text-slate-300">
                                Email
                              </Label>
                              <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-slate-800 border-slate-700 text-slate-100"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 pt-4 border-t border-slate-700/50">
                          <h3 className="text-lg font-medium text-slate-100">Password</h3>
                          <div className="grid gap-4 pt-2">
                            <div className="space-y-2">
                              <Label htmlFor="current-password" className="text-slate-300">
                                Current Password
                              </Label>
                              <Input
                                id="current-password"
                                type="password"
                                className="bg-slate-800 border-slate-700 text-slate-100"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="new-password" className="text-slate-300">
                                  New Password
                                </Label>
                                <Input
                                  id="new-password"
                                  type="password"
                                  className="bg-slate-800 border-slate-700 text-slate-100"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="confirm-password" className="text-slate-300">
                                  Confirm Password
                                </Label>
                                <Input
                                  id="confirm-password"
                                  type="password"
                                  className="bg-slate-800 border-slate-700 text-slate-100"
                                />
                              </div>
                            </div>
                            <Button className="w-fit bg-cyan-600 hover:bg-cyan-700">Update Password</Button>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </ProtectedRoute>
        </div>
      ) : null}
    </div>
  )
}
