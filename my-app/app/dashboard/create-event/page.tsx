"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft } from "lucide-react"
import { useSupabase } from "@/lib/supabase-provider"
import { ThemeToggle } from "@/components/theme-toggle"

export default function CreateEvent() {
  const router = useRouter()
  const { supabase, user } = useSupabase()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: "Niet ingelogd",
        description: "Je moet ingelogd zijn om een evenement aan te maken.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase
        .from("events")
        .insert({
          name,
          description,
          date,
          creator_id: user.id,
          is_active: true // Set the event as active by default
        })
        .select()

      if (error) throw error

      toast({
        title: "Evenement aangemaakt!",
        description: "Je nieuwe wandeltocht is succesvol aangemaakt.",
      })

      router.push("/dashboard")
    } catch (error: any) {
      toast({
        title: "Fout bij aanmaken evenement",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-primary py-4 rounded-b-xl">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <Link href="/dashboard">
              <h1 className="text-2xl font-bold text-primary-foreground">ScoutingHike</h1>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Link href="/dashboard" className="inline-flex items-center mb-6 text-primary hover:underline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Terug naar dashboard
        </Link>

        <Card className="max-w-2xl mx-auto rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Nieuwe Wandeltocht Aanmaken</CardTitle>
            <CardDescription>Vul de details in voor je nieuwe wandeltocht</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Naam</Label>
                <Input
                  id="name"
                  placeholder="Naam van de wandeltocht"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Beschrijving</Label>
                <Textarea
                  id="description"
                  placeholder="Beschrijving van de wandeltocht"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Datum</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="rounded-lg"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full rounded-full" disabled={loading}>
                {loading ? "Bezig met aanmaken..." : "Wandeltocht Aanmaken"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

