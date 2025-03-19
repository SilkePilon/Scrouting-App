"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Clipboard, Plus, Users, Share2, Trash2, MapPin, Clock } from "lucide-react"
import { useSupabase } from "@/lib/supabase-provider"
import type { Database } from "@/lib/database.types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { PostgrestError } from '@supabase/supabase-js'

type Event = Database["public"]["Tables"]["events"]["Row"]
type Post = Database["public"]["Tables"]["posts"]["Row"] & {
    volunteers?: { id: string; name: string }[];
    selectedVolunteer?: string; // Add this to track selection state per post
}
type WalkingGroup = Database["public"]["Tables"]["walking_groups"]["Row"] & {
    members?: string[];
    inputValue?: string; // Add this to track input state per group
}
type Checkpoint = Database["public"]["Tables"]["checkpoints"]["Row"] & { post: { name: string } }
type Volunteer = { id: string; name: string }
type VolunteerCode = {
    code: string;
    created_at: string;
    used: boolean;
    volunteer_name: string;
    expires_at: string;
    id: string; // Add ID to track codes
}

interface TabInfo {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    stats?: { label: string; value: number }[];
}

function MobileTabCard({ info, children }: { info: TabInfo; children: React.ReactNode }) {
    return (
        <Drawer>
            <DrawerTrigger asChild>
                <Card className="cursor-pointer hover:shadow-lg transition-all duration-200">
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary/10 rounded-full">
                                {info.icon}
                            </div>
                            <div>
                                <CardTitle className="text-lg">{info.title}</CardTitle>
                                <CardDescription>{info.description}</CardDescription>
                            </div>
                        </div>
                        {info.stats && (
                            <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                                {info.stats.map((stat, index) => (
                                    <div key={index}>
                                        <div className="text-2xl font-bold">{stat.value}</div>
                                        <div className="text-xs text-muted-foreground">{stat.label}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardHeader>
                </Card>
            </DrawerTrigger>
            <DrawerContent>
                <div className="mx-auto w-full max-w-lg">
                    <DrawerHeader>
                        <DrawerTitle>{info.title}</DrawerTitle>
                        <DrawerDescription>{info.description}</DrawerDescription>
                    </DrawerHeader>
                    <div className="p-4 overflow-y-auto pb-20">
                        {children}
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}

export function EventDetailContent({ eventId }: { eventId: string }) {
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
    const [allVolunteers, setAllVolunteers] = useState<Volunteer[]>([])
    const [newVolunteerName, setNewVolunteerName] = useState("")
    const [volunteerCode, setVolunteerCode] = useState("")
    const [generatedCodes, setGeneratedCodes] = useState<VolunteerCode[]>([])

    const fetchVolunteers = async () => {
        try {
            // Get all volunteers for this event
            const { data: volunteersData, error } = await supabase
                .from("volunteers")
                .select("id, name")
                .eq("event_id", eventId)

            if (error) throw error

            // Set all volunteers
            setAllVolunteers(volunteersData || [])

            // Get assigned volunteers
            const { data: assignedVolunteers, error: assignedError } = await supabase
                .from("post_volunteers")
                .select("post_id, volunteer_id")
                .in("post_id", posts.map(p => p.id))

            if (assignedError) throw assignedError

            // Filter out volunteers that are already assigned to any post for the available list
            const assignedIds = new Set(assignedVolunteers?.map(v => v.volunteer_id) || [])
            const availableVolunteers = volunteersData?.filter(v => !assignedIds.has(v.id)) || []

            setAvailableVolunteers(availableVolunteers)
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Er is een fout opgetreden'
            toast({
                title: "Fout bij ophalen vrijwilligers",
                description: message,
                variant: "destructive",
            })
        }
    }

    useEffect(() => {
        if (!user) {
            router.push("/login")
            return
        }

        const fetchEventData = async () => {
            try {
                const { data: eventData, error: eventError } = await supabase
                    .from("events")
                    .select("*")
                    .eq("id", eventId)
                    .single()
                if (eventError) throw eventError
                setEvent(eventData)

                const { data: postsData, error: postsError } = await supabase
                    .from("posts")
                    .select(`*,
                        post_volunteers (
                            id,
                            volunteer_id
                        )
                    `)
                    .eq("event_id", eventId)
                    .order("order_number", { ascending: true })
                if (postsError) throw postsError

                const postsWithVolunteers = await Promise.all(
                    postsData.map(async (post: any) => {
                        const volunteers = []
                        if (post.post_volunteers && post.post_volunteers.length > 0) {
                            const volunteerIds = post.post_volunteers.map((v: any) => v.volunteer_id)
                            const { data: volunteerData, error: volunteerError } = await supabase
                                .from("volunteers")
                                .select("id, name")
                                .in("id", volunteerIds)
                            if (!volunteerError && volunteerData) {
                                volunteers.push(...volunteerData)
                            }
                        }
                        return {
                            ...post,
                            volunteers,
                        }
                    }),
                )
                setPosts(postsWithVolunteers)

                const { data: groupsData, error: groupsError } = await supabase
                    .from("walking_groups")
                    .select("*")
                    .eq("event_id", eventId)
                    .order("name", { ascending: true })
                if (groupsError) throw groupsError

                // Fetch members for each group
                const groupsWithMembers = await Promise.all(
                    groupsData.map(async (group) => {
                        const { data: membersData, error: membersError } = await supabase
                            .from("walking_group_members")
                            .select("member_name")
                            .eq("walking_group_id", group.id)

                        if (membersError) throw membersError

                        return {
                            ...group,
                            members: membersData.map(m => m.member_name)
                        }
                    })
                )

                setWalkingGroups(groupsWithMembers)

                const { data: checkpointsData, error: checkpointsError } = await supabase
                    .from("checkpoints")
                    .select(`*,
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
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Er is een fout opgetreden'
                toast({
                    title: "Fout bij ophalen gegevens",
                    description: message,
                    variant: "destructive",
                })
            } finally {
                setLoading(false)
            }
        }
        fetchEventData()
    }, [supabase, eventId, user, router, toast])

    useEffect(() => {
        if (event && posts.length > 0) {
            fetchVolunteers()
        }
    }, [supabase, event, posts, toast, eventId])

    useEffect(() => {
        const loadExistingCodes = async () => {
            try {
                const { data, error } = await supabase
                    .from("volunteer_codes")
                    .select("access_code, created_at, expires_at, used, volunteer_name, id")
                    .eq("event_id", eventId)
                    .order("created_at", { ascending: false })

                if (error) throw error

                // Map the database results to match our VolunteerCode type
                const codes = data.map(code => ({
                    code: code.access_code,
                    created_at: code.created_at,
                    expires_at: code.expires_at,
                    used: code.used,
                    volunteer_name: code.volunteer_name,
                    id: code.id // Add ID to track codes
                }))

                // Filter out expired and unused codes
                const now = new Date()
                const validCodes = codes.filter(code => {
                    if (code.used) return true // Keep used codes
                    const expiryDate = new Date(code.expires_at)
                    return expiryDate > now // Only keep unexpired codes
                })

                setGeneratedCodes(validCodes)

                // Clean up expired codes
                const expiredCodes = codes.filter(code => {
                    if (code.used) return false // Don't delete used codes
                    const expiryDate = new Date(code.expires_at)
                    return expiryDate <= now
                })

                if (expiredCodes.length > 0) {
                    await supabase
                        .from("volunteer_codes")
                        .delete()
                        .in('id', expiredCodes.map(c => c.id))
                }
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Er is een fout opgetreden'
                toast({
                    title: "Fout bij ophalen toegangscodes",
                    description: message,
                    variant: "destructive",
                })
            }
        }

        if (event) {
            loadExistingCodes()
            // Refresh codes every minute to update expiration timers
            const interval = setInterval(loadExistingCodes, 60000)
            return () => clearInterval(interval)
        }
    }, [supabase, event, eventId, toast])

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
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Er is een fout opgetreden'
            toast({
                title: "Fout bij verwijderen",
                description: message,
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
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Er is een fout opgetreden'
            toast({
                title: "Fout bij bijwerken",
                description: message,
                variant: "destructive",
            })
        }
    }

    const assignVolunteer = async (postId: string, volunteerId: string) => {
        try {
            const { error } = await supabase
                .from("post_volunteers")
                .insert({
                    post_id: postId,
                    volunteer_id: volunteerId
                })

            if (error) throw error

            // Get the volunteer data to update the UI
            const { data: volunteerData, error: volunteerError } = await supabase
                .from("volunteers")
                .select("id, name")
                .eq("id", volunteerId)
                .single()

            if (volunteerError) throw volunteerError

            setPosts(posts.map(p => {
                if (p.id === postId) {
                    return {
                        ...p,
                        volunteers: [...(p.volunteers || []), volunteerData],
                        selectedVolunteer: '' // Clear the selection after assigning
                    }
                }
                return p
            }))

            toast({
                title: "Vrijwilliger toegewezen",
                description: "De vrijwilliger is succesvol toegewezen aan de post.",
            })

            setAvailableVolunteers(availableVolunteers.filter(v => v.id !== volunteerId))
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Er is een fout opgetreden'
            toast({
                title: "Fout bij toewijzen",
                description: message,
                variant: "destructive",
            })
        }
    }

    const handleVolunteerSelection = (postId: string, value: string) => {
        setPosts(posts.map(post =>
            post.id === postId
                ? { ...post, selectedVolunteer: value }
                : post
        ))
    }

    const removeVolunteer = async (postId: string, volunteerId: string) => {
        try {
            const { error } = await supabase
                .from("post_volunteers")
                .delete()
                .eq("post_id", postId)
                .eq("volunteer_id", volunteerId)

            if (error) throw error

            setPosts(posts.map(p => p.id === postId ? {
                ...p,
                volunteers: p.volunteers?.filter(v => v.id !== volunteerId) || []
            } : p))

            // Add the volunteer back to the available list
            const { data: volunteerData, error: volunteerError } = await supabase
                .from("volunteers")
                .select("id, name")
                .eq("id", volunteerId)
                .single()

            if (!volunteerError && volunteerData) {
                setAvailableVolunteers([...availableVolunteers, volunteerData])
            }

            toast({
                title: "Vrijwilliger verwijderd",
                description: "De vrijwilliger is succesvol verwijderd van de post.",
            })
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Er is een fout opgetreden'
            toast({
                title: "Fout bij verwijderen",
                description: message,
                variant: "destructive",
            })
        }
    }

    const addPost = async () => {
        if (!event) return

        // Get the highest order number
        const maxOrder = posts.length > 0 ? Math.max(...posts.map((p) => p.order_number)) : 0

        try {
            const { error } = await supabase
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

            const { data: refreshedPosts, error: refreshError } = await supabase
                .from("posts")
                .select("*")
                .eq("event_id", event.id)
                .order("order_number", { ascending: true })

            if (refreshError) throw refreshError

            setPosts(refreshedPosts)
            setNewPostName("")
            setNewPostLocation("")
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Er is een fout opgetreden'
            toast({
                title: "Fout bij toevoegen post",
                description: message,
                variant: "destructive",
            })
        }
    }

    const addWalkingGroup = async () => {
        if (!event) return

        try {
            const { error } = await supabase
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

            const { data: refreshedGroups, error: refreshError } = await supabase
                .from("walking_groups")
                .select("*")
                .eq("event_id", event.id)
                .order("name", { ascending: true })

            if (refreshError) throw refreshError

            setWalkingGroups(refreshedGroups)
            setNewGroupName("")
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Er is een fout opgetreden'
            toast({
                title: "Fout bij toevoegen loopgroep",
                description: message,
                variant: "destructive",
            })
        }
    }

    const deleteWalkingGroup = async (groupId: string) => {
        if (!confirm("Weet je zeker dat je deze loopgroep wilt verwijderen?")) return

        try {
            const { error } = await supabase
                .from("walking_groups")
                .delete()
                .eq("id", groupId)

            if (error) throw error

            setWalkingGroups(walkingGroups.filter(g => g.id !== groupId))
            toast({
                title: "Loopgroep verwijderd",
                description: "De loopgroep is succesvol verwijderd.",
            })
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Er is een fout opgetreden'
            toast({
                title: "Fout bij verwijderen",
                description: message,
                variant: "destructive",
            })
        }
    }

    const deleteCheckpoint = async (checkpointId: string) => {
        try {
            const { error } = await supabase
                .from("checkpoints")
                .delete()
                .eq("id", checkpointId)

            if (error) throw error

            setCheckpoints(checkpoints.filter(c => c.id !== checkpointId))
            toast({
                title: "Checkpoint verwijderd",
                description: "Het checkpoint is succesvol verwijderd.",
            })
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Er is een fout opgetreden'
            toast({
                title: "Fout bij verwijderen",
                description: message,
                variant: "destructive",
            })
        }
    }

    const generateAccessCode = async () => {
        if (!newVolunteerName.trim()) {
            toast({
                title: "Naam vereist",
                description: "Voer een naam in voor de vrijwilliger",
                variant: "destructive",
            })
            return
        }

        try {
            // Check if a code already exists for this volunteer name
            const { data: existingCode, error: checkError } = await supabase
                .from("volunteer_codes")
                .select("*")
                .eq("event_id", eventId)
                .eq("volunteer_name", newVolunteerName.trim())
                .maybeSingle()

            if (checkError) throw checkError

            if (existingCode) {
                toast({
                    title: "Dubbele naam",
                    description: "Er bestaat al een toegangscode voor deze vrijwilliger.",
                    variant: "destructive",
                })
                return
            }

            const code = Math.random().toString(36).substring(2, 7).toUpperCase()
            const now = new Date()
            const expiresAt = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now

            const { data, error } = await supabase
                .from("volunteer_codes")
                .insert({
                    event_id: eventId,
                    access_code: code,
                    created_at: now.toISOString(),
                    expires_at: expiresAt.toISOString(),
                    used: false,
                    volunteer_name: newVolunteerName.trim()
                })
                .select()
                .single()

            if (error) throw error

            // Update the local state with the new code
            const newCode = {
                code: code,
                created_at: now.toISOString(),
                expires_at: expiresAt.toISOString(),
                used: false,
                volunteer_name: newVolunteerName.trim(),
                id: data.id
            }
            setGeneratedCodes(prevCodes => [newCode, ...prevCodes])
            setNewVolunteerName("")

            toast({
                title: "Toegangscode gegenereerd",
                description: `Nieuwe code voor ${newVolunteerName}: ${code}`,
            })
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Er is een fout opgetreden'
            toast({
                title: "Fout bij genereren code",
                description: message,
                variant: "destructive",
            })
        }
    }

    const formatTimeRemaining = (expiresAt: string) => {
        const now = new Date()
        const expiry = new Date(expiresAt)
        const diff = expiry.getTime() - now.getTime()

        if (diff <= 0) return "Verlopen"

        const minutes = Math.floor(diff / 60000)
        if (minutes < 60) {
            return `${minutes}m resterend`
        }
        return "~1u resterend"
    }

    const deleteAccessCode = async (code: string) => {
        try {
            // First get the volunteer information
            const { data: codeData, error: codeError } = await supabase
                .from("volunteer_codes")
                .select("*")
                .eq("access_code", code)
                .eq("event_id", eventId)
                .single()

            if (codeError) throw codeError
            if (!codeData) throw new Error("Code not found")

            if (codeData.used) {
                // Delete the volunteer entry if code was used
                const { error: volunteerError } = await supabase
                    .from("volunteers")
                    .delete()
                    .eq("name", codeData.volunteer_name)
                    .eq("event_id", eventId)

                if (volunteerError) throw volunteerError
            }

            // Delete the access code
            const { error } = await supabase
                .from("volunteer_codes")
                .delete()
                .eq("access_code", code)
                .eq("event_id", eventId)

            if (error) throw error

            // Update local state to remove the deleted code
            setGeneratedCodes(prev => prev.filter(item => item.code !== code))

            // Refresh volunteer lists if code was used
            if (codeData.used) {
                await fetchVolunteers()
            }

            toast({
                title: "Code verwijderd",
                description: "De toegangscode en bijbehorende vrijwilliger zijn succesvol verwijderd.",
            })
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Er is een fout opgetreden'
            toast({
                title: "Fout bij verwijderen",
                description: message,
                variant: "destructive",
            })
        }
    }

    const copyAccessCode = (code: string) => {
        navigator.clipboard.writeText(code)
        toast({
            title: "Code gekopieerd",
            description: "De toegangscode is naar je klembord gekopieerd.",
        })
    }

    const addMemberToGroup = async (groupId: string, memberName: string) => {
        if (!memberName.trim()) return

        try {
            const { error } = await supabase
                .from("walking_group_members")
                .insert({
                    walking_group_id: groupId,
                    member_name: memberName.trim()
                })

            if (error) throw error

            setWalkingGroups(groups =>
                groups.map(group =>
                    group.id === groupId
                        ? {
                            ...group,
                            members: [...(group.members || []), memberName.trim()],
                            inputValue: '' // Clear the input after adding
                        }
                        : group
                )
            )

            toast({
                title: "Lid toegevoegd",
                description: "Het nieuwe lid is succesvol toegevoegd aan de groep.",
            })
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Er is een fout opgetreden'
            toast({
                title: "Fout bij toevoegen lid",
                description: message,
                variant: "destructive",
            })
        }
    }

    const removeMemberFromGroup = async (groupId: string, memberName: string) => {
        try {
            const { error } = await supabase
                .from("walking_group_members")
                .delete()
                .eq("walking_group_id", groupId)
                .eq("member_name", memberName)

            if (error) throw error

            setWalkingGroups(groups =>
                groups.map(group =>
                    group.id === groupId
                        ? { ...group, members: (group.members || []).filter(m => m !== memberName) }
                        : group
                )
            )

            toast({
                title: "Lid verwijderd",
                description: "Het lid is succesvol verwijderd uit de groep.",
            })
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Er is een fout opgetreden'
            toast({
                title: "Fout bij verwijderen lid",
                description: message,
                variant: "destructive",
            })
        }
    }

    // Add this function to handle input changes for each group
    const handleGroupInputChange = (groupId: string, value: string) => {
        setWalkingGroups(groups =>
            groups.map(group =>
                group.id === groupId
                    ? { ...group, inputValue: value }
                    : group
            )
        )
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

    const tabsInfo: TabInfo[] = [
        {
            id: "posts",
            title: "Posten",
            description: "Beheer de checkpoints van je wandeltocht",
            icon: <MapPin className="h-5 w-5 text-primary" />,
            stats: [{ label: "Totaal", value: posts.length }]
        },
        {
            id: "groups",
            title: "Loopgroepen",
            description: "Overzicht van alle wandelgroepen",
            icon: <Users className="h-5 w-5 text-primary" />,
            stats: [{ label: "Totaal", value: walkingGroups.length }]
        },
        {
            id: "volunteers",
            title: "Vrijwilligers",
            description: "Beheer vrijwilligers en toegangscodes",
            icon: <Clipboard className="h-5 w-5 text-primary" />,
            stats: [
                { label: "Actief", value: allVolunteers.length },
                { label: "Beschikbaar", value: availableVolunteers.length },
                { label: "Codes", value: generatedCodes.length }
            ]
        },
        {
            id: "progress",
            title: "Voortgang",
            description: "Live voortgang van alle groepen",
            icon: <Clock className="h-5 w-5 text-primary" />,
            stats: [
                { label: "Groepen", value: walkingGroups.length },
                { label: "Posten", value: posts.length }
            ]
        }
    ];

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

                <div className="mb-8 bg-background p-6 rounded-xl shadow-md">
                    <h1 className="text-3xl font-bold">{event.name}</h1>
                    <div className="flex items-center mt-2 text-muted-foreground">
                        <p>Datum: {new Date(event.date).toLocaleDateString("nl-NL")}</p>
                    </div>
                    {event.description && <p className="mt-4">{event.description}</p>}
                </div>

                {/* Mobile View with Cards */}
                <div className="space-y-4 sm:hidden">
                    {tabsInfo.map((tab) => (
                        <MobileTabCard key={tab.id} info={tab}>
                            {/* Reuse existing tab content */}
                            {tab.id === "posts" && (
                                <div className="grid gap-6">
                                    {/* Posts content */}
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
                                    {/* Existing posts list */}
                                    <div className="space-y-4 overflow-x-auto">
                                        <h3 className="text-xl font-bold">Huidige Posten</h3>
                                        {posts.length === 0 ? (
                                            <p>Nog geen posten toegevoegd.</p>
                                        ) : (
                                            posts.map((post, index) => (
                                                <Card key={post.id} className="rounded-xl shadow-md">
                                                    <CardContent className="pt-6">
                                                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
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
                                                                        <div className="flex flex-wrap gap-2">
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
                                                                        <div className="flex flex-wrap gap-2">
                                                                            <Button onClick={() => setEditingPost(post)} variant="outline" size="sm">
                                                                                Bewerken
                                                                            </Button>
                                                                            <Button onClick={() => deletePost(post.id)} variant="destructive" size="sm">
                                                                                Verwijderen
                                                                            </Button>
                                                                        </div>
                                                                    </>
                                                                )}

                                                                <div>
                                                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-2">
                                                                        <p className="text-sm font-medium">Vrijwilligers:</p>
                                                                        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                                                                            <div className="w-full md:w-[200px]">
                                                                                <Select
                                                                                    value={post.selectedVolunteer || ''}
                                                                                    onValueChange={(value) => handleVolunteerSelection(post.id, value)}
                                                                                >
                                                                                    <SelectTrigger>
                                                                                        <SelectValue placeholder="Selecteer vrijwilliger" />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        {availableVolunteers.map((volunteer) => (
                                                                                            <SelectItem key={volunteer.id} value={volunteer.id}>
                                                                                                {volunteer.name}
                                                                                            </SelectItem>
                                                                                        ))}
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            </div>
                                                                            <Button
                                                                                onClick={() => post.selectedVolunteer && assignVolunteer(post.id, post.selectedVolunteer)}
                                                                                size="sm"
                                                                                disabled={!post.selectedVolunteer}
                                                                                className="w-full md:w-auto"
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
                            )}
                            {tab.id === "groups" && (
                                <div className="grid gap-6">
                                    {/* Groups content */}
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
                                                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                                            <div className="space-y-4 flex-grow w-full">
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

                                                                <div className="space-y-2">
                                                                    <Label>Leden</Label>
                                                                    <div className="flex gap-2">
                                                                        <Input
                                                                            placeholder="Naam van het lid"
                                                                            value={group.inputValue || ''}
                                                                            onChange={(e) => handleGroupInputChange(group.id, e.target.value)}
                                                                            className="flex-grow"
                                                                        />
                                                                        <Button
                                                                            onClick={() => {
                                                                                addMemberToGroup(group.id, group.inputValue || '')
                                                                            }}
                                                                            disabled={!group.inputValue?.trim()}
                                                                            size="sm"
                                                                        >
                                                                            Toevoegen
                                                                        </Button>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {group.members && group.members.length > 0 ? (
                                                                            group.members.map((member) => (
                                                                                <Badge
                                                                                    key={member}
                                                                                    variant="outline"
                                                                                    className="flex items-center gap-1"
                                                                                >
                                                                                    {member}
                                                                                    <button
                                                                                        onClick={() => removeMemberFromGroup(group.id, member)}
                                                                                        className="ml-1 text-xs hover:text-destructive"
                                                                                    >
                                                                                        ×
                                                                                    </button>
                                                                                </Badge>
                                                                            ))
                                                                        ) : (
                                                                            <p className="text-sm text-muted-foreground">Nog geen leden toegevoegd</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <Button
                                                                onClick={() => deleteWalkingGroup(group.id)}
                                                                variant="destructive"
                                                                size="sm"
                                                            >
                                                                Verwijderen
                                                            </Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                            {tab.id === "volunteers" && (
                                <div className="grid gap-6">
                                    {/* Volunteers content */}
                                    <Card className="rounded-xl shadow-md">
                                        <CardHeader>
                                            <CardTitle>Vrijwilligers Toegangscodes</CardTitle>
                                            <CardDescription>Genereer toegangscodes voor vrijwilligers</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="volunteerName">Naam Vrijwilliger</Label>
                                                <Input
                                                    id="volunteerName"
                                                    placeholder="Naam van de vrijwilliger"
                                                    value={newVolunteerName}
                                                    onChange={(e) => setNewVolunteerName(e.target.value)}
                                                    className="rounded-lg"
                                                />
                                            </div>
                                            <Button onClick={generateAccessCode} className="w-full" disabled={!newVolunteerName.trim()}>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Nieuwe Toegangscode Genereren
                                            </Button>

                                            <div className="mt-4">
                                                <h4 className="text-sm font-medium mb-2">Gegenereerde codes:</h4>
                                                {generatedCodes.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {generatedCodes.map((item) => (
                                                            <Card key={item.code} className="rounded-xl shadow-sm">
                                                                <CardContent className="pt-6">
                                                                    <div className="flex justify-between items-start">
                                                                        <div className="space-y-2">
                                                                            <div>
                                                                                <h4 className="font-bold">{item.volunteer_name}</h4>
                                                                                <p className="text-sm text-muted-foreground font-mono bg-muted px-2 py-1 rounded inline-block mt-1">
                                                                                    {item.code}
                                                                                </p>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 text-xs">
                                                                                <Badge variant={item.used ? "secondary" : "outline"}>
                                                                                    {item.used ? "Gebruikt" : "Niet gebruikt"}
                                                                                </Badge>
                                                                                {!item.used && (
                                                                                    <span className="text-muted-foreground">
                                                                                        {formatTimeRemaining(item.expires_at)}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex flex-col md:flex-row gap-2">
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => copyAccessCode(item.code)}
                                                                                className="gap-2 w-full md:w-auto"
                                                                            >
                                                                                <Clipboard className="h-4 w-4" />
                                                                                Kopiëren
                                                                            </Button>
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => {
                                                                                    const websiteUrl = window.location.origin + "/login"
                                                                                    const expirationTime = new Date(item.expires_at).toLocaleTimeString("nl-NL", {
                                                                                        hour: "2-digit",
                                                                                        minute: "2-digit"
                                                                                    })
                                                                                    const message = `Hoi *${item.volunteer_name}*!

Graag nodigen we je uit als vrijwilliger voor het evenement *${event?.name}* dat plaatsvindt op *${event?.date}*. Je kunt inloggen op onze website via *${websiteUrl}* met je persoonlijke toegangscode: *${item.code}*. 

_Let op: deze code is geldig tot *${expirationTime}*._

We kijken ernaar uit je als vrijwilliger te verwelkomen!

Hartelijke groet,
Het organisatieteam`
                                                                                    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
                                                                                }}
                                                                                className="gap-2 w-full md:w-auto"
                                                                            >
                                                                                <Share2 className="h-4 w-4" />
                                                                                Delen via WhatsApp
                                                                            </Button>
                                                                            <Button
                                                                                variant="destructive"
                                                                                size="sm"
                                                                                onClick={() => deleteAccessCode(item.code)}
                                                                                className="gap-2 w-full md:w-auto"
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                                Verwijderen
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">Nog geen codes gegenereerd.</p>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Active Volunteers List */}
                                    <div className="space-y-4">
                                        <Card className="rounded-xl shadow-md">
                                            <CardHeader>
                                                <CardTitle>Actieve Vrijwilligers</CardTitle>
                                                <CardDescription>Vrijwilligers die zijn ingelogd</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-2">
                                                    {allVolunteers.length > 0 ? (
                                                        allVolunteers.map(volunteer => {
                                                            const isAssigned = !availableVolunteers.some(v => v.id === volunteer.id)
                                                            return (
                                                                <div key={volunteer.id} 
                                                                     className="flex flex-col sm:flex-row sm:items-center justify-between p-2 bg-muted rounded-md gap-2">
                                                                    <span className="font-medium">{volunteer.name}</span>
                                                                    <Badge variant={isAssigned ? "secondary" : "outline"}>
                                                                        {isAssigned ? "Toegewezen" : "Beschikbaar"}
                                                                    </Badge>
                                                                </div>
                                                            )
                                                        })
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground">Nog geen actieve vrijwilligers.</p>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            )}
                            {tab.id === "progress" && (
                                <div>
                                    {/* Progress content */}
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
                                                <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                                                    <div className="inline-block min-w-full align-middle">
                                                        <div className="overflow-hidden md:rounded-lg">
                                                            <table className="min-w-full divide-y divide-border">
                                                                <thead>
                                                                    <tr>
                                                                        <th className="text-left p-2 border-b bg-muted">
                                                                            <div className="flex items-center justify-between">
                                                                                <span>Loopgroep</span>
                                                                                <span className="md:hidden text-xs text-muted-foreground">Scroll →</span>
                                                                            </div>
                                                                        </th>
                                                                        {posts.map((post, index) => (
                                                                            <th key={post.id} className="text-center p-2 border-b bg-muted whitespace-nowrap">
                                                                                <span>Post {index + 1}</span>
                                                                            </th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {walkingGroups.map((group) => {
                                                                        const groupCheckpoints = checkpoints.filter((cp) => cp.walking_group_id === group.id)
                                                                        return (
                                                                            <tr key={group.id}>
                                                                                <td className="p-2 border-b font-medium whitespace-nowrap">{group.name}</td>
                                                                                {posts.map((post) => {
                                                                                    const checkpoint = groupCheckpoints.find((cp) => cp.post_id === post.id)
                                                                                    return (
                                                                                        <td key={post.id} className="text-center p-2 border-b">
                                                                                            {checkpoint ? (
                                                                                                <div className="flex flex-col items-center">
                                                                                                    <Badge variant="default" className="bg-green-500">
                                                                                                        ✓
                                                                                                    </Badge>
                                                                                                    <span className="text-xs mt-1 whitespace-nowrap">
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
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </MobileTabCard>
                    ))}
                </div>

                {/* Desktop View with Tabs */}
                <div className="hidden sm:block">
                    <Tabs defaultValue="posts" className="bg-background p-4 rounded-xl shadow-md">
                        <TabsList className="flex flex-col sm:flex-row w-full gap-2 sm:gap-0 mb-6 sm:mb-4 rounded-lg">
                            <TabsTrigger value="posts" className="w-full sm:w-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                Posten
                            </TabsTrigger>
                            <TabsTrigger value="groups" className="w-full sm:w-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                Loopgroepen
                            </TabsTrigger>
                            <TabsTrigger value="volunteers" className="w-full sm:w-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                Vrijwilligers
                            </TabsTrigger>
                            <TabsTrigger value="progress" className="w-full sm:w-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                Voortgang
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="posts">
                            <div className="grid gap-6 md:grid-cols-2 grid-cols-1">
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

                                <div className="space-y-4 overflow-x-auto">
                                    <h3 className="text-xl font-bold">Huidige Posten</h3>
                                    {posts.length === 0 ? (
                                        <p>Nog geen posten toegevoegd.</p>
                                    ) : (
                                        posts.map((post, index) => (
                                            <Card key={post.id} className="rounded-xl shadow-md">
                                                <CardContent className="pt-6">
                                                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
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
                                                                    <div className="flex flex-wrap gap-2">
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
                                                                    <div className="flex flex-wrap gap-2">
                                                                        <Button onClick={() => setEditingPost(post)} variant="outline" size="sm">
                                                                            Bewerken
                                                                        </Button>
                                                                        <Button onClick={() => deletePost(post.id)} variant="destructive" size="sm">
                                                                            Verwijderen
                                                                        </Button>
                                                                    </div>
                                                                </>
                                                            )}

                                                            <div>
                                                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-2">
                                                                    <p className="text-sm font-medium">Vrijwilligers:</p>
                                                                    <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                                                                        <div className="w-full md:w-[200px]">
                                                                            <Select
                                                                                value={post.selectedVolunteer || ''}
                                                                                onValueChange={(value) => handleVolunteerSelection(post.id, value)}
                                                                            >
                                                                                <SelectTrigger>
                                                                                    <SelectValue placeholder="Selecteer vrijwilliger" />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    {availableVolunteers.map((volunteer) => (
                                                                                        <SelectItem key={volunteer.id} value={volunteer.id}>
                                                                                            {volunteer.name}
                                                                                        </SelectItem>
                                                                                    ))}
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </div>
                                                                        <Button
                                                                            onClick={() => post.selectedVolunteer && assignVolunteer(post.id, post.selectedVolunteer)}
                                                                            size="sm"
                                                                            disabled={!post.selectedVolunteer}
                                                                            className="w-full md:w-auto"
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
                            <div className="grid gap-6 md:grid-cols-2 grid-cols-1">
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
                                                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                                        <div className="space-y-4 flex-grow w-full">
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

                                                            <div className="space-y-2">
                                                                <Label>Leden</Label>
                                                                <div className="flex gap-2">
                                                                    <Input
                                                                        placeholder="Naam van het lid"
                                                                        value={group.inputValue || ''}
                                                                        onChange={(e) => handleGroupInputChange(group.id, e.target.value)}
                                                                        className="flex-grow"
                                                                    />
                                                                    <Button
                                                                        onClick={() => addMemberToGroup(group.id, group.inputValue || '')}
                                                                        disabled={!group.inputValue?.trim()}
                                                                        size="sm"
                                                                    >
                                                                        Toevoegen
                                                                    </Button>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {group.members && group.members.length > 0 ? (
                                                                        group.members.map((member) => (
                                                                            <Badge
                                                                                key={member}
                                                                                variant="outline"
                                                                                className="flex items-center gap-1"
                                                                            >
                                                                                {member}
                                                                                <button
                                                                                    onClick={() => removeMemberFromGroup(group.id, member)}
                                                                                    className="ml-1 text-xs hover:text-destructive"
                                                                                >
                                                                                    ×
                                                                                </button>
                                                                            </Badge>
                                                                        ))
                                                                    ) : (
                                                                        <p className="text-sm text-muted-foreground">Nog geen leden toegevoegd</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            onClick={() => deleteWalkingGroup(group.id)}
                                                            variant="destructive"
                                                            size="sm"
                                                        >
                                                            Verwijderen
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="volunteers">
                            <div className="grid gap-6 md:grid-cols-2 grid-cols-1">
                                <Card className="rounded-xl shadow-md">
                                    <CardHeader>
                                        <CardTitle>Vrijwilligers Toegangscodes</CardTitle>
                                        <CardDescription>Genereer toegangscodes voor vrijwilligers</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="volunteerName">Naam Vrijwilliger</Label>
                                            <Input
                                                id="volunteerName"
                                                placeholder="Naam van de vrijwilliger"
                                                value={newVolunteerName}
                                                onChange={(e) => setNewVolunteerName(e.target.value)}
                                                className="rounded-lg"
                                            />
                                        </div>
                                        <Button onClick={generateAccessCode} className="w-full" disabled={!newVolunteerName.trim()}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Nieuwe Toegangscode Genereren
                                        </Button>

                                        <div className="mt-4">
                                            <h4 className="text-sm font-medium mb-2">Gegenereerde codes:</h4>
                                            {generatedCodes.length > 0 ? (
                                                <div className="space-y-2">
                                                    {generatedCodes.map((item) => (
                                                        <Card key={item.code} className="rounded-xl shadow-sm">
                                                            <CardContent className="pt-6">
                                                                <div className="flex justify-between items-start">
                                                                    <div className="space-y-2">
                                                                        <div>
                                                                            <h4 className="font-bold">{item.volunteer_name}</h4>
                                                                            <p className="text-sm text-muted-foreground font-mono bg-muted px-2 py-1 rounded inline-block mt-1">
                                                                                {item.code}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-xs">
                                                                            <Badge variant={item.used ? "secondary" : "outline"}>
                                                                                {item.used ? "Gebruikt" : "Niet gebruikt"}
                                                                            </Badge>
                                                                            {!item.used && (
                                                                                <span className="text-muted-foreground">
                                                                                    {formatTimeRemaining(item.expires_at)}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-col md:flex-row gap-2">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => copyAccessCode(item.code)}
                                                                            className="gap-2 w-full md:w-auto"
                                                                        >
                                                                            <Clipboard className="h-4 w-4" />
                                                                            Kopiëren
                                                                        </Button>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                const websiteUrl = window.location.origin + "/login"
                                                                                const expirationTime = new Date(item.expires_at).toLocaleTimeString("nl-NL", {
                                                                                    hour: "2-digit",
                                                                                    minute: "2-digit"
                                                                                })
                                                                                const message = `Hoi *${item.volunteer_name}*!

Graag nodigen we je uit als vrijwilliger voor het evenement *${event?.name}* dat plaatsvindt op *${event?.date}*. Je kunt inloggen op onze website via *${websiteUrl}* met je persoonlijke toegangscode: *${item.code}*. 

_Let op: deze code is geldig tot *${expirationTime}*._

We kijken ernaar uit je als vrijwilliger te verwelkomen!

Hartelijke groet,
Het organisatieteam`
                                                                                window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
                                                                            }}
                                                                            className="gap-2 w-full md:w-auto"
                                                                        >
                                                                            <Share2 className="h-4 w-4" />
                                                                            Delen via WhatsApp
                                                                        </Button>
                                                                        <Button
                                                                            variant="destructive"
                                                                            size="sm"
                                                                            onClick={() => deleteAccessCode(item.code)}
                                                                            className="gap-2 w-full md:w-auto"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                            Verwijderen
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">Nog geen codes gegenereerd.</p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Active Volunteers List */}
                                <div className="space-y-4">
                                    <Card className="rounded-xl shadow-md">
                                        <CardHeader>
                                            <CardTitle>Actieve Vrijwilligers</CardTitle>
                                            <CardDescription>Vrijwilligers die zijn ingelogd</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                {allVolunteers.length > 0 ? (
                                                    allVolunteers.map(volunteer => {
                                                        const isAssigned = !availableVolunteers.some(v => v.id === volunteer.id)
                                                        return (
                                                            <div key={volunteer.id} 
                                                                 className="flex flex-col sm:flex-row sm:items-center justify-between p-2 bg-muted rounded-md gap-2">
                                                                <span className="font-medium">{volunteer.name}</span>
                                                                <Badge variant={isAssigned ? "secondary" : "outline"}>
                                                                    {isAssigned ? "Toegewezen" : "Beschikbaar"}
                                                                </Badge>
                                                            </div>
                                                        )
                                                    })
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">Nog geen actieve vrijwilligers.</p>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
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
                                        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                                            <div className="inline-block min-w-full align-middle">
                                                <div className="overflow-hidden md:rounded-lg">
                                                    <table className="min-w-full divide-y divide-border">
                                                        <thead>
                                                            <tr>
                                                                <th className="text-left p-2 border-b bg-muted">
                                                                    <div className="flex items-center justify-between">
                                                                        <span>Loopgroep</span>
                                                                        <span className="md:hidden text-xs text-muted-foreground">Scroll →</span>
                                                                    </div>
                                                                </th>
                                                                {posts.map((post, index) => (
                                                                    <th key={post.id} className="text-center p-2 border-b bg-muted whitespace-nowrap">
                                                                        <span>Post {index + 1}</span>
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {walkingGroups.map((group) => {
                                                                const groupCheckpoints = checkpoints.filter((cp) => cp.walking_group_id === group.id)
                                                                return (
                                                                    <tr key={group.id}>
                                                                        <td className="p-2 border-b font-medium whitespace-nowrap">{group.name}</td>
                                                                        {posts.map((post) => {
                                                                            const checkpoint = groupCheckpoints.find((cp) => cp.post_id === post.id)
                                                                            return (
                                                                                <td key={post.id} className="text-center p-2 border-b">
                                                                                    {checkpoint ? (
                                                                                        <div className="flex flex-col items-center">
                                                                                            <Badge variant="default" className="bg-green-500">
                                                                                                ✓
                                                                                            </Badge>
                                                                                            <span className="text-xs mt-1 whitespace-nowrap">
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
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}