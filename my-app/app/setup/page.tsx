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
import { Check, X, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

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
  const [isSubmitted, setIsSubmitted] = useState(false)

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
    setIsSubmitted(true)

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
      setIsSubmitted(false)
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
      <motion.header 
        className="bg-primary py-4 rounded-b-xl"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <Link href="/">
              <h1 className="text-2xl font-bold text-primary-foreground">ScoutingHike</h1>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </motion.header>

      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          className="w-full max-w-md"
        >
          <Card className="rounded-xl shadow-lg overflow-hidden">
            <AnimatePresence mode="wait">
              {!isSubmitted ? (
                <motion.div
                  key="setup-form"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <CardHeader>
                    <CardTitle className="text-2xl">Account instellen</CardTitle>
                    <CardDescription>
                      Stel je account gegevens in
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={handlePasswordSetup}>
                    <CardContent className="space-y-6">
                      <motion.div 
                        className="space-y-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                      >
                        <Label htmlFor="name">Naam</Label>
                        <Input
                          id="name"
                          placeholder="Jouw naam"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className="rounded-lg"
                        />
                      </motion.div>

                      <motion.div 
                        className="space-y-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                      >
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
                      </motion.div>

                      <motion.div 
                        className="space-y-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.3 }}
                      >
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
                          <AnimatePresence>
                            {confirmPassword && (
                              <motion.div 
                                initial={{ scale: 0, opacity: 0 }} 
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                className="absolute right-10 top-1/2 -translate-y-1/2"
                              >
                                {confirmPassword === password ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <X className="h-4 w-4 text-red-500" />
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>

                      <motion.div 
                        className="space-y-3"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.4 }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Wachtwoord sterkte:</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((strength) => (
                              <motion.div
                                key={strength}
                                initial={{ scaleX: 0 }}
                                animate={{ 
                                  scaleX: 1,
                                  backgroundColor: strength <= passwordStrength
                                    ? strength <= 2
                                      ? "rgb(239, 68, 68)" // red-500
                                      : strength <= 4
                                      ? "rgb(234, 179, 8)" // yellow-500
                                      : "rgb(34, 197, 94)" // green-500
                                    : "rgb(228, 228, 231)" // bg-muted
                                }}
                                transition={{ 
                                  duration: 0.3, 
                                  delay: 0.1 * strength,
                                  ease: "easeOut"
                                }}
                                className={cn(
                                  "h-2 w-6 rounded-full origin-left",
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
                            <motion.div 
                              key={index} 
                              className="flex items-center gap-2 text-sm"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ 
                                duration: 0.3,
                                delay: 0.1 * index + 0.5
                              }}
                            >
                              <AnimatePresence mode="wait">
                                {req.test(password) ? (
                                  <motion.div 
                                    key="check"
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.5, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <Check className="h-4 w-4 text-green-500" />
                                  </motion.div>
                                ) : (
                                  <motion.div
                                    key="alert"
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.5, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                              <motion.span 
                                animate={{ 
                                  color: req.test(password) 
                                    ? "rgb(34, 197, 94)" // green-500
                                    : "rgb(161, 161, 170)" // muted-foreground
                                }}
                                transition={{ duration: 0.3 }}
                                className={cn(
                                  req.test(password) ? "text-green-500" : "text-muted-foreground"
                                )}
                              >
                                {req.label}
                              </motion.span>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    </CardContent>
                    <CardFooter>
                      <motion.div 
                        className="w-full"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                      >
                        <Button 
                          type="submit" 
                          className="w-full rounded-full" 
                          disabled={loading || passwordStrength < passwordRequirements.length || password !== confirmPassword || !name}
                        >
                          {loading ? "Bezig..." : "Account instellen en inloggen"}
                        </Button>
                      </motion.div>
                    </CardFooter>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="loading-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-10 flex flex-col items-center justify-center min-h-[400px]"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.5,
                      ease: "linear"
                    }}
                    className="mb-4"
                  >
                    <Loader2 className="h-10 w-10 text-primary" />
                  </motion.div>
                  <motion.h3
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg font-medium mb-2"
                  >
                    Account wordt ingesteld
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-center text-muted-foreground"
                  >
                    Even geduld, je wordt zo doorgestuurd naar het dashboard...
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

export default function Setup() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          Laden...
        </motion.p>
      </div>
    }>
      <SetupContent />
    </Suspense>
  )
}