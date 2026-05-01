'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { ComplianceFormDialog } from './compliance-form-dialog'
import type { Client } from '@/lib/types'

interface ComplianceHeaderProps {
  clients: Pick<Client, 'id' | 'name'>[]
}

export function ComplianceHeader({ clients }: ComplianceHeaderProps) {
  const [showDialog, setShowDialog] = useState(false)

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compliance Tracker</h1>
        <p className="text-muted-foreground">
          Track statutory deadlines and filing status
        </p>
      </div>
      <Button onClick={() => setShowDialog(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add Entry
      </Button>
      <ComplianceFormDialog 
        open={showDialog} 
        onOpenChange={setShowDialog}
        clients={clients}
      />
    </div>
  )
}
