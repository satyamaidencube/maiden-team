'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { DocumentUploadDialog } from './document-upload-dialog'
import type { Client } from '@/lib/types'

interface DocumentsHeaderProps {
  clients: Pick<Client, 'id' | 'name'>[]
}

export function DocumentsHeader({ clients }: DocumentsHeaderProps) {
  const [showUploadDialog, setShowUploadDialog] = useState(false)

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">
          Securely store and manage client documents
        </p>
      </div>
      <Button onClick={() => setShowUploadDialog(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Upload Document
      </Button>

      <DocumentUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        clients={clients}
      />
    </div>
  )
}
