import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import type { TeamMember } from '@/lib/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get team member profile
  const { data: teamMember } = await supabase
    .from('team_members')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile: TeamMember = teamMember || {
    id: user.id,
    email: user.email || '',
    full_name: user.user_metadata?.full_name || user.email || 'User',
    role: user.user_metadata?.role || 'member',
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar user={profile} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader user={profile} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
