'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { EventFormDialog } from './event-form-dialog'

export function EventsHeader() {
  const [showDialog, setShowDialog] = useState(false)

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compliance Events</h1>
        <p className="text-muted-foreground">
          Configure recurring compliance events that auto-generate tasks
        </p>
      </div>
      <Button onClick={() => setShowDialog(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add Event
      </Button>
      <EventFormDialog open={showDialog} onOpenChange={setShowDialog} />
    </div>
  )
}
