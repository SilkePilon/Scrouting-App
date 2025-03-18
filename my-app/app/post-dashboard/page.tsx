"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { LogOut, CheckCircle } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/database.types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
// Add the import for ThemeToggle
import { ThemeToggle } from "@/components/theme-toggle"
import Link from "next/link"

type Event = Database["public"]["Tables"]["events"]["Row"]
type Post = Database["public"]["Tables"]["posts"]["Row"]
type WalkingGroup = Database["public"]["Tables"]["walking_groups"]["Row"]
type Checkpoint = Database["public"]["Tables"]["checkpoints"]["Row"] & {
  walking_group: { name: string }
  post: { name: string }
}
type VolunteerSession = {
  id: string;
  name: string;
  event_id: string;
  event_name: string;
  timestamp: string;
}

export default function PostDashboard() {
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [volunteerSession, setVolunteerSession] = useState<VolunteerSession | null>(null)
  const [event, setEvent] = useState<Event | null>(null)
  const [assignedPost, setAssignedPost] = useState<Post | null>(null)
  const [walkingGroups, setWalkingGroups] = useState<WalkingGroup[]>([])
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>("")
  const [notes, setNotes] = useState<string>("")

  useEffect(() => {
    // Check for volunteer session in localStorage
    const checkSession = () => {
      try {
        const sessionData = localStorage.getItem('volunteerSession')
        if (!sessionData) {
          router.push('/login')
          return
        }
        
        const session: VolunteerSession = JSON.parse(sessionData)
        setVolunteerSession(session)
        return session
      } catch (error) {
        console.error("Error retrieving volunteer session:", error)
        router.push('/login')
        return null
      }
    }
    
    const fetchData = async () => {
      try {
        const session = checkSession()
        if (!session) return
        
        // Get event details
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("*")
          .eq("id", session.event_id)
          .single()
        
        if (eventError) throw eventError
        setEvent(eventData)

        // Try to find assigned post for this volunteer
        const { data: volunteerData, error: volunteerError } = await supabase
          .from("posts")
          .select(`
            id,
            name,
            location,
            event_id,
            description,
            order_number
          `)
          .eq("event_id", session.event_id)
          .limit(1)
          .maybeSingle()
        
        if (volunteerError && volunteerError.code !== "PGRST116") {
          throw volunteerError
        }
        
        if (volunteerData) {
          setAssignedPost(volunteerData)
          
          // Get walking groups
          const { data: groupsData, error: groupsError } = await supabase
            .from("walking_groups")
            .select("*")
            .eq("event_id", session.event_id)
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
            .eq("post_id", volunteerData.id)
            .order("checked_at", { ascending: false })
          
          if (checkpointsError) throw checkpointsError
          setCheckpoints(checkpointsData)
        } else {
          toast({
            title: "Geen post toegewezen",
            description: "Er is nog geen post beschikbaar. Vraag de organisator om een post toe te voegen.",
            variant: "destructive",
          })
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
  }, [supabase, router, toast])
  
  const handleSignOut = () => {
    localStorage.removeItem('volunteerSession')
    router.push("/login")
  }
  
  const registerCheckpoint = async () => {
    if (!assignedPost || !selectedGroup || !volunteerSession) return
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
          checked_by: volunteerSession.id,
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
        <header className="bg-primary py-4 rounded-b-xl">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center">
              <Link href="/">
                <h1 className="text-2xl font-bold text-primary-foreground">ScoutingHike</h1>
              </Link>
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
          <Card className="rounded-xl shadow-md">
            <CardHeader>
              <CardTitle>Geen post beschikbaar</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 text-center">
              <p className="mb-4">
                Er zijn nog geen posten aangemaakt voor dit evenement. Vraag de organisator om posten toe te voegen.
              </p>
              <Button onClick={handleSignOut} className="rounded-full">Uitloggen</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-primary py-4 rounded-b-xl">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <Link href="/">
              <h1 className="text-2xl font-bold text-primary-foreground">ScoutingHike</h1>
            </Link>
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
            {volunteerSession && <p className="text-sm text-muted-foreground mt-2">Ingelogd als: {volunteerSession.name}</p>}
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

