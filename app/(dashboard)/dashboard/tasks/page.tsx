import { createClient } from '@/lib/supabase/server'
import { TasksHeader } from '@/components/tasks/tasks-header'
import { TasksBoard } from '@/components/tasks/tasks-board'
import type { Task, Client, TeamMember } from '@/lib/types'

async function getData() {
  const supabase = await createClient()
  
  const [tasksResult, clientsResult, membersResult] = await Promise.all([
    supabase
      .from('tasks')
      .select('*, client:clients(*), assigned_member:team_members!tasks_assigned_to_fkey(*)')
      .order('due_date', { ascending: true }),
    supabase
      .from('clients')
      .select('id, name')
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('team_members')
      .select('*')
      .order('full_name'),
  ])

  return {
    tasks: (tasksResult.data || []) as (Task & { client: Client, assigned_member: TeamMember | null })[],
    clients: clientsResult.data || [],
    teamMembers: membersResult.data || [],
  }
}

export default async function TasksPage() {
  const { tasks, clients, teamMembers } = await getData()

  return (
    <div className="space-y-6">
      <TasksHeader clients={clients} teamMembers={teamMembers} />
      <TasksBoard 
        tasks={tasks} 
        clients={clients} 
        teamMembers={teamMembers} 
      />
    </div>
  )
}
