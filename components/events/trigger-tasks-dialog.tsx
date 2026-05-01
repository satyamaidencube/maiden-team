'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format, addDays, addMonths } from 'date-fns'
import type { ComplianceEvent, Client } from '@/lib/types'

interface TriggerTasksDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: ComplianceEvent | null
}

export function TriggerTasksDialog({ open, onOpenChange, event }: TriggerTasksDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [dueDate, setDueDate] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      fetchClients()
      // Calculate default due date based on event frequency
      if (event) {
        const today = new Date()
        let defaultDue = today
        
        if (event.frequency === 'Monthly' && event.due_day) {
          defaultDue = new Date(today.getFullYear(), today.getMonth(), event.due_day)
          if (defaultDue < today) {
            defaultDue = addMonths(defaultDue, 1)
          }
        } else if (event.frequency === 'Quarterly' && event.due_day) {
          const quarterEndMonth = Math.ceil((today.getMonth() + 1) / 3) * 3 - 1
          defaultDue = new Date(today.getFullYear(), quarterEndMonth, event.due_day)
          if (defaultDue < today) {
            defaultDue = addMonths(defaultDue, 3)
          }
        } else if (event.frequency === 'Yearly' && event.due_month && event.due_day) {
          defaultDue = new Date(today.getFullYear(), event.due_month - 1, event.due_day)
          if (defaultDue < today) {
            defaultDue = new Date(today.getFullYear() + 1, event.due_month - 1, event.due_day)
          }
        } else {
          defaultDue = addDays(today, 7)
        }
        
        setDueDate(format(defaultDue, 'yyyy-MM-dd'))
      }
    }
  }, [open, event])

  async function fetchClients() {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('status', 'active')
      .order('name')
    
    if (data) {
      setClients(data)
    }
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.pan.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function toggleClient(clientId: string) {
    setSelectedClients(prev => 
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    )
  }

  function toggleAll() {
    if (selectedClients.length === filteredClients.length) {
      setSelectedClients([])
    } else {
      setSelectedClients(filteredClients.map(c => c.id))
    }
  }

  async function handleTrigger() {
    if (!event || selectedClients.length === 0 || !dueDate) {
      toast.error('Please select clients and set a due date')
      return
    }

    setIsLoading(true)

    try {
      const tasks = selectedClients.map(clientId => ({
        client_id: clientId,
        event_id: event.id,
        title: event.name,
        description: event.description,
        category: event.category,
        status: 'pending',
        priority: 'medium',
        due_date: dueDate,
      }))

      const { error } = await supabase.from('tasks').insert(tasks)

      if (error) throw error

      toast.success(`Created ${tasks.length} task(s) successfully`)
      onOpenChange(false)
      setSelectedClients([])
      router.refresh()
    } catch (error) {
      console.error('Error creating tasks:', error)
      toast.error('Failed to create tasks')
    } finally {
      setIsLoading(false)
    }
  }

  if (!event) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Trigger Tasks</DialogTitle>
          <DialogDescription>
            Create tasks for &quot;{event.name}&quot; for selected clients
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Due Date
            </Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Client Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Clients</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleAll}
              >
                {selectedClients.length === filteredClients.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <ScrollArea className="h-[250px] rounded-md border">
            <div className="p-2 space-y-1">
              {filteredClients.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No active clients found
                </p>
              ) : (
                filteredClients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleClient(client.id)}
                  >
                    <Checkbox
                      checked={selectedClients.includes(client.id)}
                      onCheckedChange={() => toggleClient(client.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{client.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {client.pan}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {client.entity_type}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {selectedClients.length} client(s) selected
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleTrigger} 
              disabled={isLoading || selectedClients.length === 0}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create {selectedClients.length} Task{selectedClients.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
