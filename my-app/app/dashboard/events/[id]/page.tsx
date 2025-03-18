"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Clipboard, Plus, Users } from "lucide-react"
import { useSupabase } from "@/lib/supabase-provider"
import type { Database } from "@/lib/database.types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"

type Event = Database["public"]["Tables"]["events"]["Row"]
type Post = Database["public"]["Tables"]["posts"]["Row"] & { volunteers?: { id: string; name: string }[] }
type WalkingGroup = Database["public"]["Tables"]["walking_groups"]["Row"]
type Checkpoint = Database["public"]["Tables"]["checkpoints"]["Row"] & { post: { name: string } }

export default function EventDetail({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { supabase, user } = useSupabase()
  const { toast } = useToast()
  const [event, setEvent] = useState<Event | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [walkingGroups, setWalkingGroups] = useState<WalkingGroup[]>([])
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [newPostName, setNewPostName] = useState("")
  const [newPostLocation, setNewPostLocation] = useState("")
  const [newGroupName, setNewGroupName] = useState("")

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    const fetchEventData = async () => {
      try {
        // Fetch event details
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("*")
          .eq("id", params.id)
          .single()

        if (eventError) throw eventError
        setEvent(eventData)

        // Fetch posts with volunteers
        const { data: postsData, error: postsError } = await supabase
          .from("posts")
          .select(`
            *,
            post_volunteers (
              id,
              user_id
            )
          `)
          .eq("event_id", params.id)
          .order("order_number", { ascending: true })

        if (postsError) throw postsError

        // Fetch volunteer names
        const postsWithVolunteers = await Promise.all(
          postsData.map(async (post) => {
            const volunteers = []

            if (post.post_volunteers && post.post_volunteers.length > 0) {
              const userIds = post.post_volunteers.map((v: any) => v.user_id)

              const { data: userData, error: userError } = await supabase
                .from("users")
                .select("id, name")
                .in("id", userIds)

              if (!userError && userData) {
                volunteers.push(...userData)
              }
            }

            return {
              ...post,
              volunteers,
            }
          }),
        )

        setPosts(postsWithVolunteers)

        // Fetch walking groups
        const { data: groupsData, error: groupsError } = await supabase
          .from("walking_groups")
          .select("*")
          .eq("event_id", params.id)
          .order("name", { ascending: true })

        if (groupsError) throw groupsError
        setWalkingGroups(groupsData)

        // Fetch checkpoints
        const { data: checkpointsData, error: checkpointsError } = await supabase
          .from("checkpoints")
          .select(`
            *,
            post:posts (
              name
            )
          `)
          .in(
            "walking_group_id",
            groupsData.map((g) => g.id),
          )
          .order("checked_at", { ascending: false })

        if (checkpointsError) throw checkpointsError
        setCheckpoints(checkpointsData)
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

    fetchEventData()
  }, [supabase, params.id, user, router, toast])

  const copyAccessCode = () => {
    if (!event) return
    navigator.clipboard.writeText(event.access_code)
    toast({
      title: "Toegangscode gekopieerd",
      description: "De code is naar je klembord gekopieerd.",
    })
  }

  const addPost = async () => {
    if (!event) return

    try {
      // Get the highest order number
      const maxOrder = posts.length > 0 ? Math.max(...posts.map((p) => p.order_number)) : 0

      const { data, error } = await supabase
        .from("posts")
        .insert({
          event_id: event.id,
          name: newPostName,
          location: newPostLocation,
          order_number: maxOrder + 1,
        })
        .select()

      if (error) throw error

      toast({
        title: "Post toegevoegd",
        description: "De nieuwe post is succesvol toegevoegd.",
      })

      // Refresh posts
      const { data: refreshedPosts, error: refreshError } = await supabase
        .from("posts")
        .select("*")
        .eq("event_id", event.id)
        .order("order_number", { ascending: true })

      if (refreshError) throw refreshError
      setPosts(refreshedPosts)

      // Reset form
      setNewPostName("")
      setNewPostLocation("")
    } catch (error: any) {
      toast({
        title: "Fout bij toevoegen post",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const addWalkingGroup = async () => {
    if (!event) return

    try {
      const { data, error } = await supabase
        .from("walking_groups")
        .insert({
          event_id: event.id,
          name: newGroupName,
          start_time: new Date().toISOString(),
        })
        .select()

      if (error) throw error

      toast({
        title: "Loopgroep toegevoegd",
        description: "De nieuwe loopgroep is succesvol toegevoegd.",
      })

      // Refresh walking groups
      const { data: refreshedGroups, error: refreshError } = await supabase
        .from("walking_groups")
        .select("*")
        .eq("event_id", event.id)
        .order("name", { ascending: true })

      if (refreshError) throw refreshError
      setWalkingGroups(refreshedGroups)

      // Reset form
      setNewGroupName("")
    } catch (error: any) {
      toast({
        title: "Fout bij toevoegen loopgroep",
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

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Evenement niet gevonden</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-primary py-4 rounded-b-xl">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <Link href="/dashboard">
              <h1 className="text-2xl font-bold text-primary-foreground">ScoutingHike</h1>
            </Link>
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <Button variant="secondary" size="sm" onClick={() => router.push("/dashboard")} className="rounded-full">
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Link href="/dashboard" className="inline-flex items-center mb-6 text-primary hover:underline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Terug naar dashboard
        </Link>

        <div className="mb-8 bg-background p-6 rounded-xl shadow-md">
          <h1 className="text-3xl font-bold">{event.name}</h1>
          <div className="flex items-center mt-2 text-muted-foreground">
            <p>Datum: {new Date(event.date).toLocaleDateString("nl-NL")}</p>
            <div className="flex items-center ml-4">
              <p className="mr-2">Toegangscode:</p>
              <code className="bg-muted p-1 rounded-lg">{event.access_code}</code>
              <Button variant="ghost" size="sm" onClick={copyAccessCode} className="rounded-full">
                <Clipboard className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {event.description && <p className="mt-4">{event.description}</p>}
        </div>

        <Tabs defaultValue="posts" className="bg-background p-4 rounded-xl shadow-md">
          <TabsList className="mb-4 rounded-lg">
            <TabsTrigger value="posts" className="rounded-l-lg">
              Posten
            </TabsTrigger>
            <TabsTrigger value="groups">Loopgroepen</TabsTrigger>
            <TabsTrigger value="progress" className="rounded-r-lg">
              Voortgang
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="rounded-xl shadow-md">
                <CardHeader>
                  <CardTitle>Posten Toevoegen</CardTitle>
                  <CardDescription>Voeg checkpoints toe voor je wandeltocht</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="postName">Naam</Label>
                    <Input
                      id="postName"
                      placeholder="Naam van de post"
                      value={newPostName}
                      onChange={(e) => setNewPostName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postLocation">Locatie</Label>
                    <Input
                      id="postLocation"
                      placeholder="Locatie van de post"
                      value={newPostLocation}
                      onChange={(e) => setNewPostLocation(e.target.value)}
                    />
                  </div>
                  <Button onClick={addPost} disabled={!newPostName} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Post Toevoegen
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <h3 className="text-xl font-bold">Huidige Posten</h3>
                {posts.length === 0 ? (
                  <p>Nog geen posten toegevoegd.</p>
                ) : (
                  posts.map((post, index) => (
                    <Card key={post.id} className="rounded-xl shadow-md">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold">{post.name}</h4>
                            {post.location && <p className="text-sm text-muted-foreground">{post.location}</p>}
                            <div className="mt-2">
                              <p className="text-sm font-medium">Vrijwilligers:</p>
                              {post.volunteers && post.volunteers.length > 0 ? (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {post.volunteers.map((volunteer) => (
                                    <Badge key={volunteer.id} variant="outline">
                                      {volunteer.name}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">Geen vrijwilligers toegewezen</p>
                              )}
                            </div>
                          </div>
                          <Badge>{`Post ${index + 1}`}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="groups">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="rounded-xl shadow-md">
                <CardHeader>
                  <CardTitle>Loopgroepen Toevoegen</CardTitle>
                  <CardDescription>Voeg groepen toe die de wandeltocht gaan lopen</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="groupName">Naam</Label>
                    <Input
                      id="groupName"
                      placeholder="Naam van de loopgroep"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                    />
                  </div>
                  <Button onClick={addWalkingGroup} disabled={!newGroupName} className="w-full">
                    <Users className="h-4 w-4 mr-2" />
                    Loopgroep Toevoegen
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <h3 className="text-xl font-bold">Huidige Loopgroepen</h3>
                {walkingGroups.length === 0 ? (
                  <p>Nog geen loopgroepen toegevoegd.</p>
                ) : (
                  walkingGroups.map((group) => (
                    <Card key={group.id} className="rounded-xl shadow-md">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-bold">{group.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Starttijd:{" "}
                              {group.start_time
                                ? new Date(group.start_time).toLocaleTimeString("nl-NL", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Nog niet gestart"}
                            </p>
                          </div>
                          <Button variant="outline" size="sm">
                            Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="progress">
            <Card className="rounded-xl shadow-md">
              <CardHeader>
                <CardTitle>Voortgang van Loopgroepen</CardTitle>
                <CardDescription>Bekijk welke posten de loopgroepen hebben bezocht</CardDescription>
              </CardHeader>
              <CardContent>
                {walkingGroups.length === 0 ? (
                  <p>Voeg eerst loopgroepen toe om hun voortgang te volgen.</p>
                ) : posts.length === 0 ? (
                  <p>Voeg eerst posten toe om voortgang te kunnen registreren.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left p-2 border-b">Loopgroep</th>
                          {posts.map((post, index) => (
                            <th key={post.id} className="text-center p-2 border-b">
                              Post {index + 1}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {walkingGroups.map((group) => {
                          const groupCheckpoints = checkpoints.filter((cp) => cp.walking_group_id === group.id)

                          return (
                            <tr key={group.id}>
                              <td className="p-2 border-b font-medium">{group.name}</td>
                              {posts.map((post) => {
                                const checkpoint = groupCheckpoints.find((cp) => cp.post_id === post.id)

                                return (
                                  <td key={post.id} className="text-center p-2 border-b">
                                    {checkpoint ? (
                                      <div className="flex flex-col items-center">
                                        <Badge variant="success" className="bg-green-500">
                                          ✓
                                        </Badge>
                                        <span className="text-xs mt-1">
                                          {new Date(checkpoint.checked_at).toLocaleTimeString("nl-NL", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </span>
                                      </div>
                                    ) : (
                                      <Badge variant="outline">-</Badge>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

