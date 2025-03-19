"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { PlusCircle, LogOut, Clipboard, Users, MapPin } from "lucide-react"
import { useSupabase } from "@/lib/supabase-provider"
import type { Database } from "@/lib/database.types"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"

type Event = Database["public"]["Tables"]["events"]["Row"]
type Post = Database["public"]["Tables"]["posts"]["Row"]
type VolunteerCode = Database["public"]["Tables"]["volunteer_codes"]["Row"]
type WalkingGroup = Database["public"]["Tables"]["walking_groups"]["Row"]

interface EventWithDetails extends Event {
  posts: Post[]
  volunteerCodes: VolunteerCode[]
  walkingGroups: WalkingGroup[]
}

export default function Dashboard() {
  const router = useRouter()
  const { supabase, user, loading: authLoading } = useSupabase()
  const { toast } = useToast()
  const [events, setEvents] = useState<EventWithDetails[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)

  // Check authentication status
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }
  }, [user, authLoading, router])

  // Fetch event data
  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!user) return
      
      try {
        setLoadingEvents(true)
        console.log("Fetching events for user:", user.id) // Debug log

        // Fetch events
        const { data: eventsData, error: eventsError } = await supabase
          .from("events")
          .select("*")
          .eq("creator_id", user.id)
          .order("date", { ascending: false })

        if (eventsError) {
          console.error("Error fetching events:", eventsError) // Debug log
          throw eventsError
        }

        console.log("Found events:", eventsData?.length) // Debug log

        const eventsWithDetails: EventWithDetails[] = []

        // Fetch details for each event
        for (const event of eventsData || []) {
          console.log("Fetching details for event:", event.id) // Debug log

          const [postsResult, codesResult, groupsResult] = await Promise.all([
            supabase
              .from("posts")
              .select("*")
              .eq("event_id", event.id)
              .order("order_number", { ascending: true }),
            supabase
              .from("volunteer_codes")
              .select("*")
              .eq("event_id", event.id),
            supabase
              .from("walking_groups")
              .select("*")
              .eq("event_id", event.id)
              .order("name", { ascending: true }),
          ])

          if (postsResult.error) console.error("Error fetching posts:", postsResult.error)
          if (codesResult.error) console.error("Error fetching codes:", codesResult.error)
          if (groupsResult.error) console.error("Error fetching groups:", groupsResult.error)

          eventsWithDetails.push({
            ...event,
            posts: postsResult.data || [],
            volunteerCodes: codesResult.data || [],
            walkingGroups: groupsResult.data || [],
          })
        }

        console.log("Setting events with details:", eventsWithDetails.length) // Debug log
        setEvents(eventsWithDetails)
      } catch (error: any) {
        console.error("Error in fetchEventDetails:", error) // Debug log
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
      fetchEventDetails()
    }
  }, [supabase, user, toast])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Authenticatie controleren...</p>
      </div>
    )
  }

  // Redirect if not authenticated
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Redirecting...</p>
      </div>
    )
  }

  if (loadingEvents) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Evenementen laden...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-primary py-3 sm:py-4 rounded-b-xl">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl sm:text-2xl font-bold text-primary-foreground">ScoutingHike</h1>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="secondary" size="sm" onClick={handleSignOut} className="rounded-full">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Uitloggen</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold">Mijn Wandeltochten</h2>
          <Link href="/dashboard/create-event">
            <Button className="w-full sm:w-auto rounded-full">
              <PlusCircle className="h-4 w-4 mr-2" />
              Nieuwe Wandeltocht
            </Button>
          </Link>
        </div>

        {events.length === 0 ? (
          <Card className="mx-auto max-w-md">
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
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Card key={event.id} className="rounded-xl shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="space-y-2">
                  <CardTitle className="text-lg sm:text-xl line-clamp-1">{event.name}</CardTitle>
                  <CardDescription>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm">
                        {new Date(event.date).toLocaleDateString("nl-NL")}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        event.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {event.is_active ? 'Actief' : 'Inactief'}
                      </span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span className="font-semibold">{event.posts.length}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Posten</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Users className="h-4 w-4 mr-1" />
                          <span className="font-semibold">{event.walkingGroups.length}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Groepen</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Clipboard className="h-4 w-4 mr-1" />
                          <span className="font-semibold">{event.volunteerCodes.length}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Codes</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                      {event.description || "Geen beschrijving"}
                    </p>
                  </div>
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

