import { Suspense } from "react"
import { EventDetailContent } from "./event-detail-content"

export default function EventPage({ params }: { params: { id: string } }) {
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

