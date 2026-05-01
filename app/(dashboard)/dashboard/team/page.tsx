import { createClient } from '@/lib/supabase/server'
import { TeamHeader } from '@/components/team/team-header'
import { TeamGrid } from '@/components/team/team-grid'
import type { TeamMember } from '@/lib/types'

async function getTeamMembers() {
  const supabase = await createClient()
  
  const { data: members, error } = await supabase
    .from('team_members')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching team members:', error)
    return []
  }

  return members as TeamMember[]
}

export default async function TeamPage() {
  const members = await getTeamMembers()

  return (
    <div className="space-y-6">
      <TeamHeader />
      <TeamGrid members={members} />
    </div>
  )
}
