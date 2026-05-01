'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { TaskFormDialog } from './task-form-dialog'
import type { Client, TeamMember } from '@/lib/types'

interface TasksHeaderProps {
  clients: Pick<Client, 'id' | 'name'>[]
  teamMembers: TeamMember[]
}

export function TasksHeader({ clients, teamMembers }: TasksHeaderProps) {
  const [showDialog, setShowDialog] = useState(false)

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-muted-foreground">
          Manage and track team tasks
        </p>
      </div>
      <Button onClick={() => setShowDialog(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add Task
      </Button>
      <TaskFormDialog 
        open={showDialog} 
        onOpenChange={setShowDialog}
        clients={clients}
        teamMembers={teamMembers}
      />
    </div>
  )
}
