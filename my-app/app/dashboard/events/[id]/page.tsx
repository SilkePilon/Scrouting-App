
import { Suspense } from "react"
import { EventDetailContent } from "./event-detail-content"

export default async function EventPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p>Laden...</p>
      </div>
    }>
      <EventDetailContent eventId={id} />
    </Suspense>
  )
}

