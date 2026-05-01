import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ClientsTable } from '@/components/clients/clients-table'
import { ClientsHeader } from '@/components/clients/clients-header'
import { Skeleton } from '@/components/ui/skeleton'
import type { Client, TeamMember } from '@/lib/types'

async function getClients() {
  const supabase = await createClient()
  
  const { data: clients, error } = await supabase
    .from('clients')
    .select('*, assigned_member:team_members!clients_assigned_to_fkey(*)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching clients:', error)
    return []
  }

  return clients as (Client & { assigned_member: TeamMember | null })[]
}

async function getTeamMembers() {
  const supabase = await createClient()
  
  const { data: members } = await supabase
    .from('team_members')
    .select('*')
    .order('full_name')

  return members || []
}

export default async function ClientsPage() {
  const [clients, teamMembers] = await Promise.all([
    getClients(),
    getTeamMembers(),
  ])

  return (
    <div className="space-y-6">
      <ClientsHeader />
      <Suspense fallback={<TableSkeleton />}>
        <ClientsTable clients={clients} teamMembers={teamMembers} />
      </Suspense>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  )
}
