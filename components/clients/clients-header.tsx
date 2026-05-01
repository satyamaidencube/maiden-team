'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { ClientFormDialog } from './client-form-dialog'

export function ClientsHeader() {
  const [showDialog, setShowDialog] = useState(false)

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        <p className="text-muted-foreground">
          Manage your client portfolio
        </p>
      </div>
      <Button onClick={() => setShowDialog(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add Client
      </Button>
      <ClientFormDialog open={showDialog} onOpenChange={setShowDialog} />
    </div>
  )
}
