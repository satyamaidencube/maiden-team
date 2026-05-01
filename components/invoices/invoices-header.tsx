'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { InvoiceFormDialog } from './invoice-form-dialog'
import type { Client } from '@/lib/types'

interface InvoicesHeaderProps {
  clients: Pick<Client, 'id' | 'name' | 'gstin' | 'address' | 'city' | 'state' | 'pincode'>[]
}

export function InvoicesHeader({ clients }: InvoicesHeaderProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <p className="text-muted-foreground">
          Create and manage client invoices
        </p>
      </div>
      <Button onClick={() => setShowCreateDialog(true)}>
        <Plus className="mr-2 h-4 w-4" />
        New Invoice
      </Button>

      <InvoiceFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        clients={clients}
      />
    </div>
  )
}
