"use client"
import React, { useEffect, useState, Suspense } from "react"
import { useRouter, useParams } from "next/navigation"
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
import { Combobox } from "@/components/ui/combobox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type Event = Database["public"]["Tables"]["events"]["Row"]
type Post = Database["public"]["Tables"]["posts"]["Row"] & { volunteers?: { id: string; name: string }[] }
type WalkingGroup = Database["public"]["Tables"]["walking_groups"]["Row"]
type Checkpoint = Database["public"]["Tables"]["checkpoints"]["Row"] & { post: { name: string } }
type Volunteer = { id: string; name: string }

async function EventDetailContent({ eventId }: { eventId: string }) {
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
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [availableVolunteers, setAvailableVolunteers] = useState<Volunteer[]>([])
  const [selectedVolunteer, setSelectedVolunteer] = useState("")

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
          .eq("id", eventId)
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
          .eq("event_id", eventId)
          .order("order_number", { ascending: true })
        if (postsError) throw postsError
        // Fetch volunteer names
        const postsWithVolunteers = await Promise.all(
          postsData.map(async (post: any) => {
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
          .eq("event_id", eventId)
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
            groupsData.map((g: WalkingGroup) => g.id),
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
  }, [supabase, eventId, user, router, toast])
  
  // Add useEffect to fetch available volunteers
  useEffect(() => {
    const fetchVolunteers = async () => {
      try {
        const { data, error } = await supabase
          .from("volunteers")
          .select("id, name")
          .eq("event_id", eventId)
        
        if (error) throw error
        setAvailableVolunteers(data || [])
      } catch (error: any) {
        toast({
          title: "Fout bij ophalen vrijwilligers",
          description: error.message,
          variant: "destructive",
        })
      }
    }
    
    if (event) {
      fetchVolunteers()
    }
  }, [supabase, eventId, event, toast])

  const deletePost = async (postId: string) => {
    if (!confirm("Weet je zeker dat je deze post wilt verwijderen?")) return

    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)

      if (error) throw error

      setPosts(posts.filter(p => p.id !== postId))
      toast({
        title: "Post verwijderd",
        description: "De post is succesvol verwijderd.",
      })
    } catch (error: any) {
      toast({
        title: "Fout bij verwijderen",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const updatePost = async (postId: string, updates: Partial<Post>) => {
    try {
      const { error } = await supabase
        .from("posts")
        .update(updates)
        .eq("id", postId)

      if (error) throw error

      setPosts(posts.map(p => p.id === postId ? { ...p, ...updates } : p))
      setEditingPost(null)
      toast({
        title: "Post bijgewerkt",
        description: "De post is succesvol bijgewerkt.",
      })
    } catch (error: any) {
      toast({
        title: "Fout bij bijwerken",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const assignVolunteer = async (postId: string, volunteerId: string) => {
    try {
      // First check if volunteer is already assigned to another post
      const { data: existingAssignment, error: checkError } = await supabase
        .from("post_volunteers")
        .select("id")
        .eq("user_id", volunteerId)
        .single()

      if (checkError && checkError.code !== "PGRST116") throw checkError

      if (existingAssignment) {
        toast({
          title: "Vrijwilliger al toegewezen",
          description: "Deze vrijwilliger is al toegewezen aan een andere post.",
          variant: "destructive",
        })
        return
      }

      // Assign volunteer to post
      const { error } = await supabase
        .from("post_volunteers")
        .insert({
          post_id: postId,
          user_id: volunteerId
        })

      if (error) throw error

      // Refresh posts to update UI
      const { data: refreshedPost, error: refreshError } = await supabase
        .from("posts")
        .select(`
          *,
          post_volunteers (
            id,
            user_id,
            users (
              id,
              name
            )
          )
        `)
        .eq("id", postId)
        .single()

      if (refreshError) throw refreshError

      const volunteer = refreshedPost.post_volunteers[0].users
      setPosts(posts.map(p => p.id === postId ? {
        ...p,
        volunteers: [...(p.volunteers || []), volunteer]
      } : p))

      toast({
        title: "Vrijwilliger toegewezen",
        description: "De vrijwilliger is succesvol toegewezen aan de post.",
      })
      
      setSelectedVolunteer("")
    } catch (error: any) {
      toast({
        title: "Fout bij toewijzen",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const removeVolunteer = async (postId: string, volunteerId: string) => {
    try {
      const { error } = await supabase
        .from("post_volunteers")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", volunteerId)

      if (error) throw error

      setPosts(posts.map(p => p.id === postId ? {
        ...p,
        volunteers: p.volunteers?.filter(v => v.id !== volunteerId) || []
      } : p))

      toast({
        title: "Vrijwilliger verwijderd",
        description: "De vrijwilliger is succesvol verwijderd van de post.",
      })
    } catch (error: any) {
      toast({
        title: "Fout bij verwijderen",
        description: error.message,
        variant: "destructive",
      })
    }
  }

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
                          <div className="space-y-4 w-full">
                            {editingPost?.id === post.id ? (
                              <div className="space-y-2">
                                <Input
                                  value={editingPost.name}
                                  onChange={(e) => setEditingPost({ ...editingPost, name: e.target.value })}
                                  placeholder="Post naam"
                                />
                                <Input
                                  value={editingPost.location || ""}
                                  onChange={(e) => setEditingPost({ ...editingPost, location: e.target.value })}
                                  placeholder="Locatie"
                                />
                                <div className="flex gap-2">
                                  <Button onClick={() => updatePost(post.id, editingPost)} size="sm">
                                    Opslaan
                                  </Button>
                                  <Button onClick={() => setEditingPost(null)} variant="outline" size="sm">
                                    Annuleren
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div>
                                  <h4 className="font-bold">{post.name}</h4>
                                  {post.location && <p className="text-sm text-muted-foreground">{post.location}</p>}
                                </div>
                                <div className="flex gap-2">
                                  <Button onClick={() => setEditingPost(post)} variant="outline" size="sm">
                                    Bewerken
                                  </Button>
                                  <Button onClick={() => deletePost(post.id)} variant="destructive" size="sm">
                                    Verwijderen
                                  </Button>
                                </div>
                              </>
                            )}
                            
                            <div className="mt-4">
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-sm font-medium">Vrijwilligers:</p>
                                <div className="flex gap-2">
                                  <div className="w-[200px]">
                                    <Combobox
                                      options={availableVolunteers.map(v => ({
                                        value: v.id,
                                        label: v.name
                                      }))}
                                      value={selectedVolunteer}
                                      onValueChange={setSelectedVolunteer}
                                      placeholder="Selecteer vrijwilliger"
                                      emptyText="Geen vrijwilligers gevonden"
                                    />
                                  </div>
                                  <Button
                                    onClick={() => selectedVolunteer && assignVolunteer(post.id, selectedVolunteer)}
                                    size="sm"
                                    disabled={!selectedVolunteer}
                                  >
                                    Toewijzen
                                  </Button>
                                </div>
                              </div>
                              
                              {post.volunteers && post.volunteers.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {post.volunteers.map((volunteer) => (
                                    <Badge
                                      key={volunteer.id}
                                      variant="outline"
                                      className="flex items-center gap-1"
                                    >
                                      {volunteer.name}
                                      <button
                                        onClick={() => removeVolunteer(post.id, volunteer.id)}
                                        className="ml-1 text-xs hover:text-destructive"
                                      >
                                        ×
                                      </button>
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">Geen vrijwilligers toegewezen</p>
                              )}
                            </div>
                          </div>
                          <Badge className="ml-4 whitespace-nowrap">{`Post ${index + 1}`}</Badge>
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
                                        <Badge variant="default" className="bg-green-500">
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

export default async function EventDetail({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p>Laden...</p>
      </div>
    }>
      <EventDetailContent eventId={params.id} />
    </Suspense>
  )
}

