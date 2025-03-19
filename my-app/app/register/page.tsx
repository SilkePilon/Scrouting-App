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
          emailRedirectTo: `${window.location.origin}/login?setup=true`,
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
          <div className={cn(
            "transition-all duration-500 ease-in-out transform",
            isSuccess ? "-translate-y-full" : "translate-y-0"
          )}>
            <div className="relative">
              {/* Registration Form */}
              <div className={cn(
                "transition-opacity duration-500",
                isSuccess ? "opacity-0" : "opacity-100"
              )}>
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
              </div>

              {/* Success Message */}
              <div className={cn(
                "absolute top-0 left-0 w-full h-full bg-background transition-opacity duration-500",
                isSuccess ? "opacity-100" : "opacity-0 pointer-events-none"
              )}>
                <div className="p-6 flex flex-col items-center justify-center space-y-4 min-h-[400px]">
                  <div className="text-primary rounded-full p-2 bg-primary/10 animate-bounce">
                    <Mail className="h-12 w-12" />
                  </div>
                  <h2 className="text-2xl font-semibold text-center mt-4">Controleer je inbox</h2>
                  <p className="text-center text-muted-foreground max-w-sm">
                    We hebben een e-mail gestuurd naar <span className="font-medium text-foreground">{email}</span> met een link om je account te activeren.
                  </p>
                  <div className="flex flex-col items-center space-y-2 mt-4 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      De e-mail kan een paar minuten onderweg zijn
                    </p>
                    <p>Vergeet niet om ook je spam folder te controleren</p>
                  </div>
                  <Button variant="outline" className="mt-6" asChild>
                    <Link href="/login">Ga naar inloggen</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

