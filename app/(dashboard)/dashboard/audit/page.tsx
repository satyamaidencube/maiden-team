import { createClient } from '@/lib/supabase/server'
import { AuditLogHeader } from '@/components/audit/audit-log-header'
import { AuditLogTable } from '@/components/audit/audit-log-table'
import type { AuditLog, TeamMember } from '@/lib/types'

async function getData() {
  const supabase = await createClient()
  
  const [logsResult, membersResult] = await Promise.all([
    supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('team_members')
      .select('*')
      .order('full_name'),
  ])

  return {
    logs: (logsResult.data || []) as AuditLog[],
    teamMembers: membersResult.data || [],
  }
}

export default async function AuditLogPage() {
  const { logs, teamMembers } = await getData()

  return (
    <div className="space-y-6">
      <AuditLogHeader />
      <AuditLogTable logs={logs} teamMembers={teamMembers} />
    </div>
  )
}
