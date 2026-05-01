import { createClient } from '@/lib/supabase/server'
import { EventsHeader } from '@/components/events/events-header'
import { EventsList } from '@/components/events/events-list'
import type { ComplianceEvent } from '@/lib/types'

async function getComplianceEvents() {
  const supabase = await createClient()
  
  const { data: events, error } = await supabase
    .from('compliance_events')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching events:', error)
    return []
  }

  return events as ComplianceEvent[]
}

export default async function EventsPage() {
  const events = await getComplianceEvents()

  return (
    <div className="space-y-6">
      <EventsHeader />
      <EventsList events={events} />
    </div>
  )
}
