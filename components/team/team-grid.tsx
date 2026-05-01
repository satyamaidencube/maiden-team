'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  MoreHorizontal, 
  Shield, 
  UserCog, 
  User,
  Mail,
  Calendar,
  Trash2,
  Users
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { TeamMember, UserRole } from '@/lib/types'

interface TeamGridProps {
  members: TeamMember[]
}

const roleConfig: Record<UserRole, { label: string, icon: React.ElementType, color: string }> = {
  admin: { label: 'Admin', icon: Shield, color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  manager: { label: 'Manager', icon: UserCog, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  member: { label: 'Member', icon: User, color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
}

export function TeamGrid({ members }: TeamGridProps) {
  const [editMember, setEditMember] = useState<TeamMember | null>(null)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [selectedRole, setSelectedRole] = useState<UserRole>('member')
  const router = useRouter()
  const supabase = createClient()

  const roleCounts = members.reduce((acc, m) => {
    acc[m.role] = (acc[m.role] || 0) + 1
    return acc
  }, {} as Record<UserRole, number>)

  async function updateRole(memberId: string, newRole: UserRole) {
    const { error } = await supabase
      .from('team_members')
      .update({ role: newRole })
      .eq('id', memberId)

    if (error) {
      toast.error('Failed to update role')
      return
    }

    toast.success('Role updated successfully')
    setShowRoleDialog(false)
    setEditMember(null)
    router.refresh()
  }

  async function deleteMember(memberId: string) {
    if (!confirm('Are you sure you want to remove this team member?')) return

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId)

    if (error) {
      toast.error('Failed to remove team member')
      return
    }

    toast.success('Team member removed')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{members.length}</p>
              <p className="text-xs text-muted-foreground">Total Members</p>
            </div>
          </CardContent>
        </Card>
        {(['admin', 'manager', 'member'] as UserRole[]).map(role => {
          const config = roleConfig[role]
          const Icon = config.icon
          return (
            <Card key={role}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.color.split(' ')[0]}`}>
                  <Icon className={`h-5 w-5 ${config.color.split(' ')[1]}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{roleCounts[role] || 0}</p>
                  <p className="text-xs text-muted-foreground">{config.label}s</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Team Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => {
          const config = roleConfig[member.role]
          const Icon = config.icon

          return (
            <Card key={member.id} className="group">
              <CardHeader className="flex flex-row items-start justify-between p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                      {member.full_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{member.full_name}</h3>
                    <Badge variant="outline" className={`mt-1 ${config.color}`}>
                      <Icon className="mr-1 h-3 w-3" />
                      {config.label}
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      setEditMember(member)
                      setSelectedRole(member.role)
                      setShowRoleDialog(true)
                    }}>
                      <UserCog className="mr-2 h-4 w-4" />
                      Change Role
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => deleteMember(member.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove Member
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{member.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {format(new Date(member.created_at), 'MMM yyyy')}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {members.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No team members yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Invite team members to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Role Change Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Update the role for {editMember?.full_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Admin
                  </div>
                </SelectItem>
                <SelectItem value="manager">
                  <div className="flex items-center gap-2">
                    <UserCog className="h-4 w-4" />
                    Manager
                  </div>
                </SelectItem>
                <SelectItem value="member">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Member
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="rounded-lg bg-muted p-3 text-sm">
              {selectedRole === 'admin' && 'Full access to all features including team management and settings.'}
              {selectedRole === 'manager' && 'Can manage clients, tasks, and view reports. Cannot change settings.'}
              {selectedRole === 'member' && 'Can view assigned clients and complete assigned tasks.'}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => editMember && updateRole(editMember.id, selectedRole)}
              disabled={editMember?.role === selectedRole}
            >
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
