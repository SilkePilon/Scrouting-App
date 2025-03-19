"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
// Add the import for ThemeToggle
import { ThemeToggle } from "@/components/theme-toggle"

export default function Login() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [accessCode, setAccessCode] = useState("")
  const [volunteerName, setVolunteerName] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast({
        title: "Inloggen gelukt!",
        description: "Je wordt doorgestuurd naar je dashboard.",
      })

      router.push("/dashboard")
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Inloggen mislukt",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVolunteerLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Convert access code to uppercase for consistency
      const normalizedCode = accessCode.toUpperCase()

      // 2. Find and validate the volunteer code
      const { data: codeData, error: codeError } = await supabase
        .from("volunteer_codes")
        .select("id, event_id, access_code, used")
        .eq("access_code", normalizedCode)
        .single()

      if (codeError || !codeData) {
        throw new Error("Ongeldige toegangscode")
      }

      if (codeData.used) {
        throw new Error("Deze toegangscode is al gebruikt")
      }

      // 3. Get event details
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("id, name")
        .eq("id", codeData.event_id)
        .eq("is_active", true)
        .single()

      if (eventError || !eventData) {
        throw new Error("Evenement niet gevonden of niet meer actief")
      }

      // 4. Create a volunteer entry
      const { data: volunteerData, error: volunteerError } = await supabase
        .from("volunteers")
        .insert({
          name: volunteerName,
          event_id: eventData.id,
          login_timestamp: new Date().toISOString(),
        })
        .select()
        .single()

      if (volunteerError) throw volunteerError

      // 5. Mark the volunteer code as used
      const { error: updateError } = await supabase
        .from("volunteer_codes")
        .update({
          used: true,
          used_at: new Date().toISOString(),
          volunteer_name: volunteerName
        })
        .eq("id", codeData.id)

      if (updateError) throw updateError

      // Store the volunteer session data in localStorage
      localStorage.setItem('volunteerSession', JSON.stringify({
        id: volunteerData.id,
        name: volunteerName,
        event_id: eventData.id,
        event_name: eventData.name,
        timestamp: new Date().toISOString()
      }))

      toast({
        title: "Inloggen gelukt!",
        description: `Je bent ingelogd voor evenement: ${eventData.name}`,
      })

      router.push("/post-dashboard")
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Inloggen mislukt",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Update the return statement to include a header with the theme toggle
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
        <Card className="w-full max-w-md rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Inloggen</CardTitle>
            <CardDescription>Log in bij je account of gebruik een toegangscode</CardDescription>
          </CardHeader>
          <Tabs defaultValue="organizer">
            <TabsList className="grid w-full grid-cols-2 rounded-lg">
              <TabsTrigger value="organizer" className="rounded-l-lg">
                Organisator
              </TabsTrigger>
              <TabsTrigger value="volunteer" className="rounded-r-lg">
                Postbemanning
              </TabsTrigger>
            </TabsList>
            <TabsContent value="organizer">
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4 pt-4">
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
                  <div className="space-y-2">
                    <Label htmlFor="password">Wachtwoord</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="rounded-lg"
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                  <Button type="submit" className="w-full rounded-full" disabled={loading}>
                    {loading ? "Bezig met inloggen..." : "Inloggen"}
                  </Button>
                  <div className="text-center text-sm">
                    Nog geen account?{" "}
                    <Link href="/register" className="text-primary hover:underline">
                      Registreren
                    </Link>
                  </div>
                </CardFooter>
              </form>
            </TabsContent>
            <TabsContent value="volunteer">
              <form onSubmit={handleVolunteerLogin}>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="accessCode">Toegangscode</Label>
                    <Input
                      id="accessCode"
                      placeholder="12345"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      maxLength={5}
                      required
                      className="rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="volunteerName">Jouw naam</Label>
                    <Input
                      id="volunteerName"
                      placeholder="Naam"
                      value={volunteerName}
                      onChange={(e) => setVolunteerName(e.target.value)}
                      required
                      className="rounded-lg"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full rounded-full" disabled={loading}>
                    {loading ? "Bezig met inloggen..." : "Deelnemen aan evenement"}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}

