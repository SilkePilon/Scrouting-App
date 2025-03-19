"use client"

import { CardFooter } from "@/components/ui/card"
import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { ThemeToggle } from "@/components/theme-toggle"
import { Mail, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

export default function Register() {
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/setup`,
        },
      })

      if (authError) throw authError

      setIsSuccess(true)
    } catch (error: any) {
      toast({
        title: "Registratie mislukt",
        description: error.message,
        variant: "destructive",
      })
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
          <div className="relative h-[400px]">
            <AnimatePresence mode="wait">
              {!isSuccess ? (
                <motion.div 
                  key="registration-form"
                  className="absolute w-full"
                  initial={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                >
                  <CardHeader>
                    <CardTitle className="text-2xl">Registreren</CardTitle>
                    <CardDescription>Voer je e-mailadres in om te beginnen</CardDescription>
                  </CardHeader>
                  <form onSubmit={handleRegister}>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="jouw@email.nl"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="rounded-lg"
                        />
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-2">
                      <Button type="submit" className="w-full rounded-full" disabled={loading}>
                        {loading ? "E-mail wordt verstuurd..." : "Verificatie e-mail versturen"}
                      </Button>
                      <div className="text-center text-sm">
                        Heb je al een account?{" "}
                        <Link href="/login" className="text-primary hover:underline">
                          Inloggen
                        </Link>
                      </div>
                    </CardFooter>
                  </form>
                </motion.div>
              ) : (
                <motion.div 
                  key="success-message"
                  className="absolute top-0 left-0 w-full h-full bg-background"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                >
                  <div className="p-6 flex flex-col items-center justify-center space-y-4 min-h-[400px]">
                    <motion.div 
                      className="text-primary rounded-full p-2 bg-primary/10"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ 
                        duration: 0.5, 
                        ease: "easeOut",
                        delay: 0.2
                      }}
                    >
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ 
                          repeat: Infinity, 
                          duration: 2,
                          ease: "easeInOut"
                        }}
                      >
                        <Mail className="h-12 w-12" />
                      </motion.div>
                    </motion.div>
                    <motion.h2 
                      className="text-2xl font-semibold text-center mt-4"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                    >
                      Controleer je inbox
                    </motion.h2>
                    <motion.p 
                      className="text-center text-muted-foreground max-w-sm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.5 }}
                    >
                      We hebben een e-mail gestuurd naar <span className="font-medium text-foreground">{email}</span> met een link om je account te activeren.
                    </motion.p>
                    <motion.div 
                      className="flex flex-col items-center space-y-2 mt-4 text-sm text-muted-foreground"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                    >
                      <p className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        De e-mail kan een paar minuten onderweg zijn
                      </p>
                      <p>Vergeet niet om ook je spam folder te controleren</p>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6, duration: 0.5 }}
                    >
                      <Button variant="outline" className="mt-6" asChild>
                        <Link href="/login">Ga naar inloggen</Link>
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </div>
    </div>
  )
}

