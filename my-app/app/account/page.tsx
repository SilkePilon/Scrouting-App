"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { ThemeToggle } from "@/components/theme-toggle"
import { useSupabase } from "@/lib/supabase-provider"
import { Loader2, LogOut, Mail, Key, UserX } from "lucide-react"

export default function Account() {
  const router = useRouter()
  const { toast } = useToast()
  const { supabase, user, loading: authLoading } = useSupabase()
  const [loading, setLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [currentEmail, setCurrentEmail] = useState("")
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)

  // Check authentication status
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }
    
    if (user) {
      setCurrentEmail(user.email || "")
      setNewEmail(user.email || "")
    }
  }, [user, authLoading, router])
  
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailLoading(true)
    
    try {
      if (newEmail === currentEmail) {
        throw new Error("Dit is al je huidige e-mailadres")
      }
      
      const { error } = await supabase.auth.updateUser({ 
        email: newEmail 
      })
      
      if (error) throw error
      
      toast({
        title: "Verificatie-e-mail verzonden",
        description: "Controleer je inbox om je e-mailadres te bevestigen.",
      })
    } catch (error: any) {
      toast({
        title: "Wijziging mislukt",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setEmailLoading(false)
    }
  }
  
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordLoading(true)
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(currentEmail)
      
      if (error) throw error
      
      toast({
        title: "E-mail verzonden",
        description: "Controleer je inbox voor een link om je wachtwoord opnieuw in te stellen.",
      })
    } catch (error: any) {
      toast({
        title: "Aanvraag mislukt",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setPasswordLoading(false)
    }
  }
  
  const handleDeleteAccount = async () => {
    if (deleteConfirmEmail !== currentEmail) {
      toast({
        title: "Verificatie mislukt",
        description: "Het ingevulde e-mailadres komt niet overeen met je account.",
        variant: "destructive",
      })
      return
    }
    
    setDeleteLoading(true)
    
    try {
      // First delete custom user data if you have any
      if (user) {
        const { error: userDataError } = await supabase
          .from('users')  // Replace with your actual user table
          .delete()
          .eq('id', user.id)
        
        // If you want to handle the case where there's no user_profiles entry, you can check
        // if the error is a "no rows found" type error and ignore it
        
        if (userDataError && !userDataError.message.includes("no rows")) {
          throw userDataError
        }
      }
      
      // Then delete the auth user
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
        user?.id || ""
      )
      
      if (authDeleteError) {
        // If admin delete is not available, try regular signOut approach
        await supabase.auth.signOut()
        
        toast({
          title: "Account verwijdering aangevraagd",
          description: "Neem contact op met de beheerder voor volledige verwijdering.",
        })
        
        router.push("/login")
        return
      }
      
      toast({
        title: "Account verwijderd",
        description: "Je account is definitief verwijderd.",
      })
      
      router.push("/")
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Verwijderen mislukt",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
      setDialogOpen(false)
    }
  }
  
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
  
  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-primary py-3 sm:py-4 rounded-b-xl">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex justify-between items-center">
            <Link href="/dashboard">
              <h1 className="text-xl sm:text-2xl font-bold text-primary-foreground">ScoutingHike</h1>
            </Link>
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
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold">Account beheren</h2>
          <Link href="/dashboard">
            <Button variant="outline" className="rounded-full">
              Terug naar dashboard
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Email Update Section */}
          <Card className="rounded-xl shadow-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <CardTitle>E-mailadres wijzigen</CardTitle>
              </div>
              <CardDescription>
                Wijzig het e-mailadres waarmee je inlogt
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdateEmail}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-email">Huidig e-mailadres</Label>
                  <Input
                    id="current-email"
                    value={currentEmail}
                    disabled
                    className="rounded-lg bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-email">Nieuw e-mailadres</Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="nieuw@email.nl"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    className="rounded-lg"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full rounded-full" 
                  disabled={emailLoading || newEmail === currentEmail}
                >
                  {emailLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      E-mail wordt gewijzigd...
                    </>
                  ) : "E-mailadres wijzigen"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Password Change Section */}
          <Card className="rounded-xl shadow-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                <CardTitle>Wachtwoord wijzigen</CardTitle>
              </div>
              <CardDescription>
                Vraag een wachtwoordreset aan via e-mail
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleChangePassword}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password-email">E-mail voor reset link</Label>
                  <Input
                    id="password-email"
                    value={currentEmail}
                    disabled
                    className="rounded-lg bg-muted"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  We sturen een e-mail naar dit adres met een link om je wachtwoord opnieuw in te stellen.
                </p>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full rounded-full" 
                  disabled={passwordLoading}
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      E-mail wordt verzonden...
                    </>
                  ) : "Reset e-mail versturen"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Account Deletion Section */}
          <Card className="rounded-xl shadow-md md:col-span-2 border-destructive/20">
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-destructive" />
                <CardTitle className="text-destructive">Account verwijderen</CardTitle>
              </div>
              <CardDescription>
                Verwijder je account en alle bijbehorende gegevens permanent
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <p className="text-sm">
                  Deze actie kan <span className="font-bold">niet</span> ongedaan worden gemaakt. 
                  Alle gegevens, inclusief je evenementen, looproutes en vrijwilligerscodes zullen 
                  permanent worden verwijderd.
                </p>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="rounded-full">
                      Account verwijderen
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[90%] max-w-md mx-auto rounded-xl">
                    <DialogHeader>
                      <DialogTitle className="text-destructive">Account permanent verwijderen</DialogTitle>
                      <DialogDescription>
                        Deze actie kan niet ongedaan worden gemaakt. Je account en alle bijbehorende gegevens 
                        worden permanent verwijderd.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <p className="text-sm">
                        Bevestig door je e-mailadres in te vullen: <span className="font-medium">{currentEmail}</span>
                      </p>
                      <Input
                        value={deleteConfirmEmail}
                        onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                        placeholder="E-mail ter bevestiging"
                        className="rounded-lg"
                      />
                    </div>
                    <DialogFooter className="flex flex-col sm:flex-row gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setDialogOpen(false)
                          setDeleteConfirmEmail("")
                        }}
                        className="sm:order-1"
                      >
                        Annuleren
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={handleDeleteAccount}
                        disabled={deleteLoading || deleteConfirmEmail !== currentEmail}
                        className="sm:order-2"
                      >
                        {deleteLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Account wordt verwijderd...
                          </>
                        ) : "Account definitief verwijderen"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}