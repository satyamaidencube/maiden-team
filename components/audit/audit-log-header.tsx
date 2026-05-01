'use client'

import { History } from 'lucide-react'

export function AuditLogHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <History className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Track all changes made to client records and system data
        </p>
      </div>
    </div>
  )
}
