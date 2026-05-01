'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UserPlus, Users } from 'lucide-react'
import { InviteMemberDialog } from './invite-member-dialog'

export function TeamHeader() {
  const [showInviteDialog, setShowInviteDialog] = useState(false)

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Manage team members and their roles
        </p>
      </div>
      <Button onClick={() => setShowInviteDialog(true)}>
        <UserPlus className="mr-2 h-4 w-4" />
        Invite Member
      </Button>

      <InviteMemberDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
      />
    </div>
  )
}
