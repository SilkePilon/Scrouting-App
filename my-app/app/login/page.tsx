"use client"

import { Suspense } from "react"
import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { ThemeToggle } from "@/components/theme-toggle"

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      when: "beforeChildren",
      staggerChildren: 0.1,
      duration: 0.5
    } 
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 24 
    } 
  }
}

const buttonVariants = {
  idle: { scale: 1 },
  hover: { scale: 1.03 },
  tap: { scale: 0.97 }
}

function LoginContent() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [accessCode, setAccessCode] = useState("")
  const [activeTab, setActiveTab] = useState("organizer")

  // Check if user is already authenticated
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push("/dashboard")
      }
    }
    checkSession()
  }, [supabase, router])

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
        .select("id, event_id, access_code, used, expires_at, volunteer_name")
        .eq("access_code", normalizedCode)
        .single()

      if (codeError || !codeData) {
        throw new Error("Ongeldige toegangscode")
      }

      if (codeData.used) {
        throw new Error("Deze toegangscode is al gebruikt")
      }

      // Check if code is expired using expires_at
      const expiryDate = new Date(codeData.expires_at)
      const now = new Date()
      if (now > expiryDate) {
        throw new Error("Deze toegangscode is verlopen")
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
          name: codeData.volunteer_name,
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
          used_at: new Date().toISOString()
        })
        .eq("id", codeData.id)

      if (updateError) throw updateError

      // Store the volunteer session data in localStorage
      localStorage.setItem('volunteerSession', JSON.stringify({
        id: volunteerData.id,
        name: codeData.volunteer_name,
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

  return (
    <motion.div 
      className="flex min-h-screen flex-col bg-muted"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.header 
        className="bg-primary py-4 rounded-b-xl"
        initial={{ y: -50 }}
        animate={{ y: 0 }}
        transition={{ 
          type: "spring",
          stiffness: 300,
          damping: 30
        }}
      >
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <Link href="/">
              <motion.h1 
                className="text-2xl font-bold text-primary-foreground"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                ScoutingHike
              </motion.h1>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </motion.header>

      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 20,
            delay: 0.2
          }}
          className="w-full max-w-md"
        >
          <Card className="rounded-xl shadow-lg overflow-hidden">
            <CardHeader>
              <motion.div variants={containerVariants} initial="hidden" animate="visible">
                <motion.div variants={itemVariants}>
                  <CardTitle className="text-2xl">Inloggen</CardTitle>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <CardDescription>
                    Log in bij je account of gebruik een toegangscode
                  </CardDescription>
                </motion.div>
              </motion.div>
            </CardHeader>
            <Tabs 
              defaultValue="organizer" 
              value={activeTab}
              onValueChange={setActiveTab}
            >
              <TabsList className="grid w-full grid-cols-2 rounded-lg">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <TabsTrigger value="organizer" className="rounded-l-lg">
                    Organisator
                  </TabsTrigger>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <TabsTrigger value="volunteer" className="rounded-r-lg">
                    Postbemanning
                  </TabsTrigger>
                </motion.div>
              </TabsList>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: activeTab === "organizer" ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: activeTab === "organizer" ? 20 : -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <TabsContent value="organizer">
                    <form onSubmit={handleLogin}>
                      <CardContent className="space-y-4 pt-4">
                        <motion.div 
                          className="space-y-2"
                          variants={itemVariants}
                        >
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
                        </motion.div>
                        <motion.div 
                          className="space-y-2"
                          variants={itemVariants}
                        >
                          <Label htmlFor="password">Wachtwoord</Label>
                          <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="rounded-lg"
                          />
                        </motion.div>
                      </CardContent>
                      <CardFooter className="flex flex-col space-y-2">
                        <motion.div
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                          className="w-full"
                        >
                          <Button type="submit" className="w-full rounded-full" disabled={loading}>
                            {loading ? "Bezig met inloggen..." : "Inloggen"}
                          </Button>
                        </motion.div>
                        <motion.div 
                          className="text-center text-sm"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          Nog geen account?{" "}
                          <Link href="/register" className="text-primary hover:underline">
                            Registreren
                          </Link>
                        </motion.div>
                      </CardFooter>
                    </form>
                  </TabsContent>
                  <TabsContent value="volunteer">
                    <form onSubmit={handleVolunteerLogin}>
                      <CardContent className="space-y-4 pt-4">
                        <motion.div 
                          className="space-y-2"
                          variants={itemVariants}
                        >
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
                        </motion.div>
                      </CardContent>
                      <CardFooter>
                        <motion.div
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                          className="w-full"
                        >
                          <Button type="submit" className="w-full rounded-full" disabled={loading}>
                            {loading ? "Bezig met inloggen..." : "Deelnemen aan evenement"}
                          </Button>
                        </motion.div>
                      </CardFooter>
                    </form>
                  </TabsContent>
                </motion.div>
              </AnimatePresence>
            </Tabs>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default function Login() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p>Laden...</p>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}

