"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { PlusCircle, LogOut, Clipboard } from "lucide-react"
import { useSupabase } from "@/lib/supabase-provider"
import type { Database } from "@/lib/database.types"
import Link from "next/link"
// Add the import for ThemeToggle
import { ThemeToggle } from "@/components/theme-toggle"

type Event = Database["public"]["Tables"]["events"]["Row"]

export default function Dashboard() {
  const router = useRouter()
  const { supabase, user, loading } = useSupabase()
  const { toast } = useToast()
  const [events, setEvents] = useState<Event[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchEvents = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("creator_id", user.id)
          .order("date", { ascending: false })

        if (error) throw error
        setEvents(data || [])
      } catch (error: any) {
        toast({
          title: "Fout bij ophalen evenementen",
          description: error.message,
          variant: "destructive",
        })
      } finally {
        setLoadingEvents(false)
      }
    }

    if (user) {
      fetchEvents()
    }
  }, [supabase, user, toast])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const copyAccessCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast({
      title: "Toegangscode gekopieerd",
      description: "De code is naar je klembord gekopieerd.",
    })
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Laden...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted">
      {/* Update the header section to include the ThemeToggle */}
      <header className="bg-primary py-4 rounded-b-xl">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-primary-foreground">ScoutingHike</h1>
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <Button variant="secondary" size="sm" onClick={handleSignOut} className="rounded-full">
                <LogOut className="h-4 w-4 mr-2" />
                Uitloggen
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Mijn Wandeltochten</h2>
          <Link href="/dashboard/create-event">
            <Button className="rounded-full">
              <PlusCircle className="h-4 w-4 mr-2" />
              Nieuwe Wandeltocht
            </Button>
          </Link>
        </div>

        {loadingEvents ? (
          <p>Evenementen laden...</p>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="mb-4">Je hebt nog geen wandeltochten aangemaakt.</p>
              <Link href="/dashboard/create-event">
                <Button className="rounded-full">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Eerste Wandeltocht Aanmaken
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              // Update the cards to have more rounded corners
              <Card key={event.id} className="rounded-xl shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>{event.name}</CardTitle>
                  <CardDescription>Datum: {new Date(event.date).toLocaleDateString("nl-NL")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm">
                      <span className="font-semibold">Toegangscode:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted p-1 rounded">{event.access_code}</code>
                      <Button variant="ghost" size="sm" onClick={() => copyAccessCode(event.access_code)}>
                        <Clipboard className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {event.description || "Geen beschrijving"}
                  </p>
                </CardContent>
                <CardFooter>
                  <Link href={`/dashboard/events/${event.id}`} className="w-full">
                    <Button variant="outline" className="w-full">
                      Beheren
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

