import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Users, Flag, Clock } from "lucide-react"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-primary py-6 rounded-b-xl">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-primary-foreground">ScoutingHike</h1>
            <div className="flex items-center space-x-2">
              <Link href="/login">
                <Button variant="secondary" className="rounded-full">
                  Inloggen
                </Button>
              </Link>
              <Link href="/register">
                <Button className="rounded-full">Registreren</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-12 bg-muted rounded-xl my-8">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold mb-4">Beheer je Scoutingtochten</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Een moderne app voor Nederlandse scoutinggroepen om wandeltochten eenvoudig te organiseren en te beheren.
            </p>
            <Link href="/register">
              <Button size="lg" className="rounded-full mt-4">
                Begin nu
              </Button>
            </Link>
          </div>
        </section>

        <section className="py-16 container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">Hoe het werkt</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <Users className="h-12 w-12 mb-2 text-primary" />
                <CardTitle>Maak een account</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Registreer als organisator en begin met het plannen van je wandeltocht.</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <Flag className="h-12 w-12 mb-2 text-primary" />
                <CardTitle>Creëer een tocht</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Maak een nieuwe wandeltocht aan en deel de toegangscode met je postbemanning.</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <MapPin className="h-12 w-12 mb-2 text-primary" />
                <CardTitle>Beheer posten</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Wijs vrijwilligers toe aan posten en beheer de route van je wandeltocht.</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <Clock className="h-12 w-12 mb-2 text-primary" />
                <CardTitle>Volg in realtime</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Volg de voortgang van wandelgroepen in realtime tussen verschillende posten.</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="bg-muted py-6 rounded-t-xl">
        <div className="container mx-auto px-4 text-center">
          <p>© {new Date().getFullYear()} ScoutingHike - Een app voor Nederlandse scoutinggroepen</p>
        </div>
      </footer>
    </div>
  )
}

