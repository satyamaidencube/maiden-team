'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Pencil, Trash2, Play, Calendar, Clock } from 'lucide-react'
import { EventFormDialog } from './event-form-dialog'
import { TriggerTasksDialog } from './trigger-tasks-dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { ComplianceEvent, ComplianceCategory, EventFrequency } from '@/lib/types'

interface EventsListProps {
  events: ComplianceEvent[]
}

const categoryColors: Record<ComplianceCategory, string> = {
  'GST': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Income Tax': 'bg-green-500/10 text-green-600 border-green-500/20',
  'MCA': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'TDS': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'Other': 'bg-gray-500/10 text-gray-600 border-gray-500/20',
}

const frequencyLabels: Record<EventFrequency, string> = {
  'Monthly': 'Every month',
  'Quarterly': 'Every quarter',
  'Yearly': 'Once a year',
  'One-time': 'One time only',
}

function getDueDescription(event: ComplianceEvent): string {
  if (event.frequency === 'Monthly' && event.due_day) {
    return `Due on ${event.due_day}${getOrdinalSuffix(event.due_day)} of each month`
  }
  if (event.frequency === 'Quarterly' && event.due_day) {
    return `Due on ${event.due_day}${getOrdinalSuffix(event.due_day)} of quarter-end month`
  }
  if (event.frequency === 'Yearly' && event.due_month && event.due_day) {
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
      'July', 'August', 'September', 'October', 'November', 'December']
    return `Due on ${event.due_day}${getOrdinalSuffix(event.due_day)} ${monthNames[event.due_month]}`
  }
  return 'Custom schedule'
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

export function EventsList({ events }: EventsListProps) {
  const [editEvent, setEditEvent] = useState<ComplianceEvent | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [triggerEvent, setTriggerEvent] = useState<ComplianceEvent | null>(null)
  const [showTriggerDialog, setShowTriggerDialog] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const groupedEvents = events.reduce((acc, event) => {
    if (!acc[event.category]) {
      acc[event.category] = []
    }
    acc[event.category].push(event)
    return acc
  }, {} as Record<ComplianceCategory, ComplianceEvent[]>)

  async function toggleActive(event: ComplianceEvent) {
    const { error } = await supabase
      .from('compliance_events')
      .update({ is_active: !event.is_active })
      .eq('id', event.id)

    if (error) {
      toast.error('Failed to update event')
      return
    }

    toast.success(`Event ${event.is_active ? 'disabled' : 'enabled'}`)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this event?')) return

    const { error } = await supabase.from('compliance_events').delete().eq('id', id)
    
    if (error) {
      toast.error('Failed to delete event')
      return
    }

    toast.success('Event deleted')
    router.refresh()
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No Events Configured</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create compliance events to auto-generate tasks for your clients
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedEvents).map(([category, categoryEvents]) => (
        <div key={category} className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={categoryColors[category as ComplianceCategory]}>
              {category}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {categoryEvents.length} event{categoryEvents.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categoryEvents.map((event) => (
              <Card key={event.id} className={!event.is_active ? 'opacity-60' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{event.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {frequencyLabels[event.frequency]}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setTriggerEvent(event)
                          setShowTriggerDialog(true)
                        }}>
                          <Play className="mr-2 h-4 w-4" />
                          Trigger Tasks
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setEditEvent(event)
                          setShowEditDialog(true)
                        }}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(event.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{getDueDescription(event)}</span>
                  </div>
                  {event.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {event.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active</span>
                    <Switch
                      checked={event.is_active}
                      onCheckedChange={() => toggleActive(event)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <EventFormDialog 
        open={showEditDialog} 
        onOpenChange={setShowEditDialog}
        event={editEvent}
      />

      <TriggerTasksDialog
        open={showTriggerDialog}
        onOpenChange={setShowTriggerDialog}
        event={triggerEvent}
      />
    </div>
  )
}
