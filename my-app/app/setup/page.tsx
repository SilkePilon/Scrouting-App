"use client"

import { Suspense } from "react"
import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { ThemeToggle } from "@/components/theme-toggle"
import { Check, X, Eye, EyeOff, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

function SetupContent() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const passwordRequirements = [
    { label: "Minimaal 8 tekens", test: (p: string) => p.length >= 8 },
    { label: "Minimaal 1 hoofdletter", test: (p: string) => /[A-Z]/.test(p) },
    { label: "Minimaal 1 kleine letter", test: (p: string) => /[a-z]/.test(p) },
    { label: "Minimaal 1 cijfer", test: (p: string) => /[0-9]/.test(p) },
    { label: "Minimaal 1 speciaal teken", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ]

  const passwordStrength = passwordRequirements.filter(req => req.test(password)).length

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast({
        title: "Wachtwoorden komen niet overeen",
        description: "Controleer of je wachtwoorden hetzelfde zijn",
        variant: "destructive",
      })
      return
    }

    if (passwordStrength < passwordRequirements.length) {
      toast({
        title: "Wachtwoord niet sterk genoeg",
        description: "Zorg dat je wachtwoord aan alle vereisten voldoet",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error("Geen actieve sessie gevonden")

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      // Create entry in custom users table
      const { error: userError } = await supabase
        .from("users")
        .insert({
          id: session.user.id,
          email: session.user.email,
          name: name,
          is_admin: true,  // First user is admin/organizer
        })
        .single()

      if (userError) throw userError

      toast({
        title: "Account aangemaakt!",
        description: "Je wordt nu ingelogd.",
      })

      router.push("/dashboard")
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Wachtwoord instellen mislukt",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted">
      <header className="bg-primary py-4 rounded-b-xl">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <Link href="/">
              <h1 className="text-2xl font-bold text-primary-foreground">ScoutingHike</h1>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-xl shadow-lg overflow-hidden">
          <CardHeader>
            <CardTitle className="text-2xl">Account instellen</CardTitle>
            <CardDescription>
              Stel je account gegevens in
            </CardDescription>
          </CardHeader>
          <form onSubmit={handlePasswordSetup}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Naam</Label>
                <Input
                  id="name"
                  placeholder="Jouw naam"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Wachtwoord</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="rounded-lg pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Bevestig wachtwoord</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={cn(
                      "rounded-lg pr-10",
                      confirmPassword && (
                        confirmPassword === password 
                          ? "border-green-500" 
                          : "border-red-500"
                      )
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  {confirmPassword && (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2">
                      {confirmPassword === password ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Wachtwoord sterkte:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((strength) => (
                      <div
                        key={strength}
                        className={cn(
                          "h-2 w-6 rounded-full",
                          strength <= passwordStrength
                            ? strength <= 2
                              ? "bg-red-500"
                              : strength <= 4
                              ? "bg-yellow-500"
                              : "bg-green-500"
                            : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {passwordRequirements.map((req, index) => (
                    <div 
                      key={index} 
                      className="flex items-center gap-2 text-sm"
                    >
                      <div className="transition-transform duration-300 origin-center">
                        {req.test(password) ? (
                          <Check className="h-4 w-4 text-green-500 animate-[scale_0.2s_ease-in-out]" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-muted-foreground animate-[scale_0.2s_ease-in-out]" />
                        )}
                      </div>
                      <span className={cn(
                        "transition-colors duration-300",
                        req.test(password) ? "text-green-500" : "text-muted-foreground"
                      )}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full rounded-full" 
                disabled={loading || passwordStrength < passwordRequirements.length || password !== confirmPassword}
              >
                {loading ? "Bezig..." : "Account instellen en inloggen"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default function Setup() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p>Laden...</p>
      </div>
    }>
      <SetupContent />
    </Suspense>
  )
}