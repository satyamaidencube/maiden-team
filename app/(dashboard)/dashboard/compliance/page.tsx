import { createClient } from '@/lib/supabase/server'
import { ComplianceHeader } from '@/components/compliance/compliance-header'
import { ComplianceGrid } from '@/components/compliance/compliance-grid'
import type { ComplianceTracker, Client, TeamMember } from '@/lib/types'

async function getData() {
  const supabase = await createClient()
  
  const [complianceResult, clientsResult, membersResult] = await Promise.all([
    supabase
      .from('compliance_tracker')
      .select('*, client:clients(*), filed_by_member:team_members!compliance_tracker_filed_by_fkey(*)')
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
    compliance: (complianceResult.data || []) as (ComplianceTracker & { 
      client: Client, 
      filed_by_member: TeamMember | null 
    })[],
    clients: clientsResult.data || [],
    teamMembers: membersResult.data || [],
  }
}

export default async function CompliancePage() {
  const { compliance, clients, teamMembers } = await getData()

  return (
    <div className="space-y-6">
      <ComplianceHeader clients={clients} />
      <ComplianceGrid 
        compliance={compliance} 
        clients={clients}
        teamMembers={teamMembers}
      />
    </div>
  )
}
