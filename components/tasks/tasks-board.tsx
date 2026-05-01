'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Clock, User, CheckCircle2, AlertCircle, Circle, Loader, FileCheck } from 'lucide-react'
import { TaskFormDialog } from './task-form-dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format, isPast, isToday, isTomorrow } from 'date-fns'
import type { Task, Client, TeamMember, TaskStatus, TaskPriority, ComplianceCategory } from '@/lib/types'

interface TasksBoardProps {
  tasks: (Task & { client: Client, assigned_member: TeamMember | null })[]
  clients: Pick<Client, 'id' | 'name'>[]
  teamMembers: TeamMember[]
}

const statusConfig: Record<TaskStatus, { label: string, icon: React.ElementType, color: string }> = {
  pending: { label: 'Pending', icon: Circle, color: 'bg-yellow-500/10 text-yellow-600' },
  in_progress: { label: 'In Progress', icon: Loader, color: 'bg-blue-500/10 text-blue-600' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'bg-green-500/10 text-green-600' },
  overdue: { label: 'Overdue', icon: AlertCircle, color: 'bg-red-500/10 text-red-600' },
  filed: { label: 'Filed', icon: FileCheck, color: 'bg-green-500/10 text-green-600' },
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  medium: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  high: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  urgent: 'bg-red-500/10 text-red-600 border-red-500/20',
}

const categoryColors: Record<ComplianceCategory, string> = {
  'GST': 'bg-blue-500/10 text-blue-600',
  'Income Tax': 'bg-green-500/10 text-green-600',
  'MCA': 'bg-purple-500/10 text-purple-600',
  'TDS': 'bg-orange-500/10 text-orange-600',
  'Other': 'bg-gray-500/10 text-gray-600',
}

const statusOrder: TaskStatus[] = ['pending', 'in_progress', 'overdue', 'completed', 'filed']

function getDueDateLabel(dateStr: string) {
  const date = new Date(dateStr)
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  if (isPast(date)) return 'Overdue'
  return format(date, 'MMM d')
}

function getDueDateColor(dateStr: string, status: TaskStatus) {
  if (status === 'completed' || status === 'filed') return 'text-muted-foreground'
  const date = new Date(dateStr)
  if (isPast(date) && !isToday(date)) return 'text-destructive'
  if (isToday(date)) return 'text-warning-foreground bg-warning/20 px-1.5 py-0.5 rounded'
  return 'text-muted-foreground'
}

export function TasksBoard({ tasks, clients, teamMembers }: TasksBoardProps) {
  const [filter, setFilter] = useState<'all' | ComplianceCategory>('all')
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Update overdue status for tasks
  const processedTasks = tasks.map(task => {
    if (task.status === 'pending' || task.status === 'in_progress') {
      const dueDate = new Date(task.due_date)
      if (isPast(dueDate) && !isToday(dueDate)) {
        return { ...task, status: 'overdue' as TaskStatus }
      }
    }
    return task
  })

  const filteredTasks = filter === 'all' 
    ? processedTasks 
    : processedTasks.filter(t => t.category === filter)

  const groupedTasks = statusOrder.reduce((acc, status) => {
    acc[status] = filteredTasks.filter(t => t.status === status)
    return acc
  }, {} as Record<TaskStatus, typeof filteredTasks>)

  async function updateTaskStatus(taskId: string, newStatus: TaskStatus) {
    const updates: Partial<Task> = { status: newStatus }
    
    if (newStatus === 'completed' || newStatus === 'filed') {
      const { data: { user } } = await supabase.auth.getUser()
      updates.completed_at = new Date().toISOString()
      updates.completed_by = user?.id
    } else {
      updates.completed_at = null
      updates.completed_by = null
    }

    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)

    if (error) {
      toast.error('Failed to update task')
      return
    }

    toast.success('Task updated')
    router.refresh()
  }

  async function deleteTask(taskId: string) {
    if (!confirm('Are you sure you want to delete this task?')) return

    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    
    if (error) {
      toast.error('Failed to delete task')
      return
    }

    toast.success('Task deleted')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="GST">GST</SelectItem>
            <SelectItem value="Income Tax">Income Tax</SelectItem>
            <SelectItem value="MCA">MCA</SelectItem>
            <SelectItem value="TDS">TDS</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Kanban Board */}
      <div className="grid gap-4 lg:grid-cols-5">
        {statusOrder.map((status) => {
          const config = statusConfig[status]
          const statusTasks = groupedTasks[status] || []
          const Icon = config.icon

          return (
            <div key={status} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 rounded-full px-2 py-1 ${config.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{config.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {statusTasks.length}
                </span>
              </div>

              <div className="space-y-2 min-h-[200px]">
                {statusTasks.map((task) => (
                  <Card key={task.id} className="group">
                    <CardHeader className="p-3 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm font-medium line-clamp-2">
                            {task.title}
                          </CardTitle>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {statusOrder.filter(s => s !== status).map((s) => (
                              <DropdownMenuItem 
                                key={s}
                                onClick={() => updateTaskStatus(task.id, s)}
                              >
                                Move to {statusConfig[s].label}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuItem onClick={() => {
                              setEditTask(task)
                              setShowEditDialog(true)
                            }}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deleteTask(task.id)}
                              className="text-destructive"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2">
                      <p className="text-xs text-muted-foreground truncate">
                        {task.client?.name}
                      </p>
                      
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${categoryColors[task.category]}`}>
                          {task.category}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className={getDueDateColor(task.due_date, task.status)}>
                          <Clock className="inline h-3 w-3 mr-1" />
                          {getDueDateLabel(task.due_date)}
                        </span>
                        {task.assigned_member && (
                          <div className="flex items-center gap-1">
                            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium">
                              {task.assigned_member.full_name.charAt(0)}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {statusTasks.length === 0 && (
                  <div className="rounded-lg border-2 border-dashed border-muted p-4 text-center">
                    <p className="text-xs text-muted-foreground">No tasks</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <TaskFormDialog 
        open={showEditDialog} 
        onOpenChange={setShowEditDialog}
        task={editTask}
        clients={clients}
        teamMembers={teamMembers}
      />
    </div>
  )
}
