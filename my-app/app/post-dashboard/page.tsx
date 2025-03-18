"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { LogOut, CheckCircle } from "lucide-react"
import { useSupabase } from "@/lib/supabase-provider"
import type { Database } from "@/lib/database.types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
// Add the import for ThemeToggle
import { ThemeToggle } from "@/components/theme-toggle"

type Event = Database["public"]["Tables"]["events"]["Row"]
type Post = Database["public"]["Tables"]["posts"]["Row"]
type WalkingGroup = Database["public"]["Tables"]["walking_groups"]["Row"]
type Checkpoint = Database["public"]["Tables"]["checkpoints"]["Row"] & {
  walking_group: { name: string }
  post: { name: string }
}

export default function PostDashboard() {
  const router = useRouter()
  const { supabase, user } = useSupabase()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<Event | null>(null)
  const [assignedPost, setAssignedPost] = useState<Post | null>(null)
  const [walkingGroups, setWalkingGroups] = useState<WalkingGroup[]>([])
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>("")
  const [notes, setNotes] = useState<string>("")

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    const fetchData = async () => {
      try {
        // Get user metadata to find event_id
        const { data: userData } = await supabase.auth.getUser()
        const eventId = userData.user?.user_metadata?.event_id

        if (!eventId) {
          // Try to find assigned post
          const { data: volunteerData, error: volunteerError } = await supabase
            .from("post_volunteers")
            .select(`
              post_id,
              posts (
                id,
                name,
                location,
                event_id
              )
            `)
            .eq("user_id", user.id)
            .single()

          if (volunteerError && volunteerError.code !== "PGRST116") {
            throw volunteerError
          }

          if (volunteerData) {
            setAssignedPost(volunteerData.posts as Post)

            // Get event details
            const { data: eventData, error: eventError } = await supabase
              .from("events")
              .select("*")
              .eq("id", volunteerData.posts.event_id)
              .single()

            if (eventError) throw eventError
            setEvent(eventData)

            // Get walking groups
            const { data: groupsData, error: groupsError } = await supabase
              .from("walking_groups")
              .select("*")
              .eq("event_id", volunteerData.posts.event_id)
              .order("name", { ascending: true })

            if (groupsError) throw groupsError
            setWalkingGroups(groupsData)

            // Get checkpoints for this post
            const { data: checkpointsData, error: checkpointsError } = await supabase
              .from("checkpoints")
              .select(`
                *,
                walking_group:walking_groups (
                  name
                ),
                post:posts (
                  name
                )
              `)
              .eq("post_id", volunteerData.posts.id)
              .order("checked_at", { ascending: false })

            if (checkpointsError) throw checkpointsError
            setCheckpoints(checkpointsData)
          } else {
            toast({
              title: "Geen post toegewezen",
              description: "Je bent nog niet toegewezen aan een post. Vraag de organisator om je toe te wijzen.",
              variant: "destructive",
            })
          }
        }
      } catch (error: any) {
        toast({
          title: "Fout bij ophalen gegevens",
          description: error.message,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase, user, router, toast])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const registerCheckpoint = async () => {
    if (!assignedPost || !selectedGroup) return

    try {
      // Check if this group has already been checked at this post
      const { data: existingCheck, error: checkError } = await supabase
        .from("checkpoints")
        .select("id")
        .eq("walking_group_id", selectedGroup)
        .eq("post_id", assignedPost.id)
        .maybeSingle()

      if (checkError) throw checkError

      if (existingCheck) {
        toast({
          title: "Groep al geregistreerd",
          description: "Deze groep is al eerder geregistreerd bij deze post.",
          variant: "destructive",
        })
        return
      }

      // Register new checkpoint
      const { data, error } = await supabase
        .from("checkpoints")
        .insert({
          walking_group_id: selectedGroup,
          post_id: assignedPost.id,
          checked_by: user!.id,
          notes: notes,
        })
        .select()

      if (error) throw error

      toast({
        title: "Groep geregistreerd",
        description: "De loopgroep is succesvol geregistreerd bij deze post.",
      })

      // Refresh checkpoints
      const { data: refreshedData, error: refreshError } = await supabase
        .from("checkpoints")
        .select(`
          *,
          walking_group:walking_groups (
            name
          ),
          post:posts (
            name
          )
        `)
        .eq("post_id", assignedPost.id)
        .order("checked_at", { ascending: false })

      if (refreshError) throw refreshError
      setCheckpoints(refreshedData)

      // Reset form
      setSelectedGroup("")
      setNotes("")
    } catch (error: any) {
      toast({
        title: "Fout bij registreren",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Laden...</p>
      </div>
    )
  }

  if (!assignedPost) {
    return (
      <div className="min-h-screen bg-muted">
        <header className="bg-primary py-4">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-primary-foreground">ScoutingHike</h1>
              <Button variant="secondary" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Uitloggen
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="mb-4">
                Je bent nog niet toegewezen aan een post. Vraag de organisator om je toe te wijzen.
              </p>
              <Button onClick={handleSignOut}>Uitloggen</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  // Update the return statement to include a header with the theme toggle
  return (
    <div className="min-h-screen bg-muted">
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
        <div className="mb-8 bg-background p-6 rounded-xl shadow-md">
          <h2 className="text-3xl font-bold">Post Dashboard</h2>
          <div className="mt-2">
            <p className="text-xl font-medium">{assignedPost.name}</p>
            {assignedPost.location && <p className="text-muted-foreground">{assignedPost.location}</p>}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="rounded-xl shadow-md">
            <CardHeader>
              <CardTitle>Loopgroep Registreren</CardTitle>
              <CardDescription>Registreer wanneer een loopgroep deze post passeert</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="walkingGroup">Selecteer Loopgroep</label>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="Selecteer een loopgroep" />
                  </SelectTrigger>
                  <SelectContent>
                    {walkingGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="notes">Notities (optioneel)</label>
                <Textarea
                  id="notes"
                  placeholder="Voeg eventuele notities toe"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="rounded-lg"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full rounded-full" onClick={registerCheckpoint} disabled={!selectedGroup}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Registreer Passage
              </Button>
            </CardFooter>
          </Card>

          <div className="space-y-4">
            <h3 className="text-xl font-bold">Recente Registraties</h3>
            {checkpoints.length === 0 ? (
              <p>Nog geen loopgroepen geregistreerd.</p>
            ) : (
              checkpoints.map((checkpoint) => (
                <Card key={checkpoint.id} className="rounded-xl shadow-md">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold">{checkpoint.walking_group.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Geregistreerd:{" "}
                          {new Date(checkpoint.checked_at).toLocaleTimeString("nl-NL", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {checkpoint.notes && (
                          <p className="text-sm mt-1">
                            <span className="font-medium">Notities:</span> {checkpoint.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

