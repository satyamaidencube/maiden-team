'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Search,
  Plus,
  Pencil,
  Trash2,
  History,
  User,
  Eye,
  Clock,
  Database
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import type { AuditLog, TeamMember, AuditAction } from '@/lib/types'

interface AuditLogTableProps {
  logs: AuditLog[]
  teamMembers: TeamMember[]
}

const actionConfig: Record<AuditAction, { label: string, icon: React.ElementType, color: string }> = {
  INSERT: { label: 'Created', icon: Plus, color: 'bg-green-500/10 text-green-600' },
  UPDATE: { label: 'Updated', icon: Pencil, color: 'bg-blue-500/10 text-blue-600' },
  DELETE: { label: 'Deleted', icon: Trash2, color: 'bg-red-500/10 text-red-600' },
}

const tableNames: Record<string, string> = {
  clients: 'Client',
  tasks: 'Task',
  compliance_tracker: 'Compliance',
  invoices: 'Invoice',
  invoice_items: 'Invoice Item',
  documents: 'Document',
  compliance_events: 'Event',
  team_members: 'Team Member',
}

function getChangedFields(oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null): string[] {
  if (!oldData || !newData) return []
  
  const changedFields: string[] = []
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)])
  
  for (const key of allKeys) {
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      changedFields.push(key)
    }
  }
  
  return changedFields.filter(f => !['updated_at', 'created_at'].includes(f))
}

function formatFieldName(field: string): string {
  return field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'None'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function AuditLogTable({ logs, teamMembers }: AuditLogTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState<'all' | AuditAction>('all')
  const [tableFilter, setTableFilter] = useState<string>('all')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.table_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.record_id.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter
    const matchesTable = tableFilter === 'all' || log.table_name === tableFilter

    return matchesSearch && matchesAction && matchesTable
  })

  // Stats
  const actionCounts = logs.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1
    return acc
  }, {} as Record<AuditAction, number>)

  const uniqueTables = [...new Set(logs.map(l => l.table_name))]

  const getUserName = (email: string | null) => {
    if (!email) return 'System'
    const member = teamMembers.find(m => m.email === email)
    return member?.full_name || email
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <History className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{logs.length}</p>
              <p className="text-xs text-muted-foreground">Total Events</p>
            </div>
          </CardContent>
        </Card>
        {(['INSERT', 'UPDATE', 'DELETE'] as AuditAction[]).map(action => {
          const config = actionConfig[action]
          const Icon = config.icon
          return (
            <Card key={action}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{actionCounts[action] || 0}</p>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by user, table, or record..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={actionFilter} onValueChange={(v) => setActionFilter(v as typeof actionFilter)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="INSERT">Created</SelectItem>
              <SelectItem value="UPDATE">Updated</SelectItem>
              <SelectItem value="DELETE">Deleted</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Tables" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tables</SelectItem>
              {uniqueTables.map(table => (
                <SelectItem key={table} value={table}>
                  {tableNames[table] || table}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Changes</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <History className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No audit logs found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => {
                const config = actionConfig[log.action]
                const Icon = config.icon
                const changedFields = getChangedFields(log.old_data, log.new_data)

                return (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(log.created_at), 'dd MMM yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), 'HH:mm:ss')}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{getUserName(log.user_email)}</p>
                          {log.ip_address && (
                            <p className="text-xs text-muted-foreground font-mono">
                              {log.ip_address}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={config.color}>
                        <Icon className="mr-1 h-3 w-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{tableNames[log.table_name] || log.table_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.action === 'UPDATE' && changedFields.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {changedFields.slice(0, 3).map(field => (
                            <Badge key={field} variant="outline" className="text-xs">
                              {formatFieldName(field)}
                            </Badge>
                          ))}
                          {changedFields.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{changedFields.length - 3} more
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {log.action === 'INSERT' ? 'New record' : 
                           log.action === 'DELETE' ? 'Record removed' : '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => {
                          setSelectedLog(log)
                          setShowDetailDialog(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6 pr-4">
                {/* Meta Info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">Timestamp</p>
                    <p className="text-sm font-medium">
                      {format(new Date(selectedLog.created_at), 'PPpp')}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">User</p>
                    <p className="text-sm font-medium">
                      {getUserName(selectedLog.user_email)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">Action</p>
                    <Badge variant="outline" className={actionConfig[selectedLog.action].color}>
                      {actionConfig[selectedLog.action].label}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">Table</p>
                    <p className="text-sm font-medium">
                      {tableNames[selectedLog.table_name] || selectedLog.table_name}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">Record ID</p>
                    <p className="text-sm font-mono">{selectedLog.record_id}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase">IP Address</p>
                    <p className="text-sm font-mono">
                      {selectedLog.ip_address || 'Not recorded'}
                    </p>
                  </div>
                </div>

                {/* Changes */}
                {selectedLog.action === 'UPDATE' && selectedLog.old_data && selectedLog.new_data && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Changes Made</p>
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50 border-b">
                            <th className="px-3 py-2 text-left font-medium">Field</th>
                            <th className="px-3 py-2 text-left font-medium">Old Value</th>
                            <th className="px-3 py-2 text-left font-medium">New Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getChangedFields(selectedLog.old_data, selectedLog.new_data).map(field => (
                            <tr key={field} className="border-b last:border-0">
                              <td className="px-3 py-2 font-medium">{formatFieldName(field)}</td>
                              <td className="px-3 py-2 text-destructive">
                                {formatValue(selectedLog.old_data?.[field])}
                              </td>
                              <td className="px-3 py-2 text-green-600">
                                {formatValue(selectedLog.new_data?.[field])}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Full Data for INSERT/DELETE */}
                {(selectedLog.action === 'INSERT' || selectedLog.action === 'DELETE') && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">
                      {selectedLog.action === 'INSERT' ? 'Created Data' : 'Deleted Data'}
                    </p>
                    <div className="rounded-lg border bg-muted/30 p-3 overflow-x-auto">
                      <pre className="text-xs">
                        {JSON.stringify(
                          selectedLog.new_data || selectedLog.old_data, 
                          null, 
                          2
                        )}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
