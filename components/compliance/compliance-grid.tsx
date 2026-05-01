'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Search, Clock, CheckCircle2, AlertCircle, Loader, FileCheck, Calendar } from 'lucide-react'
import { ComplianceFormDialog } from './compliance-form-dialog'
import { FileComplianceDialog } from './file-compliance-dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format, isPast, isToday } from 'date-fns'
import type { ComplianceTracker, Client, TeamMember, ComplianceType, ComplianceStatus } from '@/lib/types'

interface ComplianceGridProps {
  compliance: (ComplianceTracker & { client: Client, filed_by_member: TeamMember | null })[]
  clients: Pick<Client, 'id' | 'name'>[]
  teamMembers: TeamMember[]
}

const statusConfig: Record<ComplianceStatus, { label: string, icon: React.ElementType, variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: 'Pending', icon: Clock, variant: 'outline' },
  in_progress: { label: 'In Progress', icon: Loader, variant: 'secondary' },
  filed: { label: 'Filed', icon: FileCheck, variant: 'default' },
  overdue: { label: 'Overdue', icon: AlertCircle, variant: 'destructive' },
}

const complianceTypes: ComplianceType[] = [
  'GSTR-1', 'GSTR-3B', 'GSTR-9', 'ITR', 'TDS Return', 
  'MCA Annual Return', 'MCA AOC-4', 'MCA MGT-7', 'Other'
]

const typeCategories: Record<string, ComplianceType[]> = {
  'GST': ['GSTR-1', 'GSTR-3B', 'GSTR-9'],
  'Income Tax': ['ITR', 'TDS Return'],
  'MCA': ['MCA Annual Return', 'MCA AOC-4', 'MCA MGT-7'],
}

function getCategoryFromType(type: ComplianceType): string {
  for (const [category, types] of Object.entries(typeCategories)) {
    if (types.includes(type)) return category
  }
  return 'Other'
}

const categoryColors: Record<string, string> = {
  'GST': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Income Tax': 'bg-green-500/10 text-green-600 border-green-500/20',
  'MCA': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'Other': 'bg-gray-500/10 text-gray-600 border-gray-500/20',
}

export function ComplianceGrid({ compliance, clients, teamMembers }: ComplianceGridProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ComplianceStatus>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | ComplianceType>('all')
  const [editItem, setEditItem] = useState<ComplianceTracker | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [fileItem, setFileItem] = useState<ComplianceTracker | null>(null)
  const [showFileDialog, setShowFileDialog] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Process overdue status
  const processedCompliance = compliance.map(item => {
    if (item.status === 'pending' || item.status === 'in_progress') {
      const dueDate = new Date(item.due_date)
      if (isPast(dueDate) && !isToday(dueDate)) {
        return { ...item, status: 'overdue' as ComplianceStatus }
      }
    }
    return item
  })

  const filteredCompliance = processedCompliance.filter(item => {
    const matchesSearch = 
      item.client?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.compliance_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.period.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    const matchesType = typeFilter === 'all' || item.compliance_type === typeFilter
    
    return matchesSearch && matchesStatus && matchesType
  })

  // Group by status for summary cards
  const statusCounts = processedCompliance.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1
    return acc
  }, {} as Record<ComplianceStatus, number>)

  async function updateStatus(id: string, newStatus: ComplianceStatus) {
    const { error } = await supabase
      .from('compliance_tracker')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update status')
      return
    }

    toast.success('Status updated')
    router.refresh()
  }

  async function deleteItem(id: string) {
    if (!confirm('Are you sure you want to delete this entry?')) return

    const { error } = await supabase.from('compliance_tracker').delete().eq('id', id)
    
    if (error) {
      toast.error('Failed to delete entry')
      return
    }

    toast.success('Entry deleted')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        {(['pending', 'in_progress', 'overdue', 'filed'] as ComplianceStatus[]).map((status) => {
          const config = statusConfig[status]
          const count = statusCounts[status] || 0
          const Icon = config.icon

          return (
            <Card 
              key={status} 
              className={`cursor-pointer transition-colors ${statusFilter === status ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  status === 'overdue' ? 'bg-destructive/10' :
                  status === 'filed' ? 'bg-green-500/10' :
                  status === 'in_progress' ? 'bg-blue-500/10' : 'bg-muted'
                }`}>
                  <Icon className={`h-5 w-5 ${
                    status === 'overdue' ? 'text-destructive' :
                    status === 'filed' ? 'text-green-600' :
                    status === 'in_progress' ? 'text-blue-600' : 'text-muted-foreground'
                  }`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{count}</p>
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
            placeholder="Search by client, type, or period..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {complianceTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
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
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Filed</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCompliance.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Calendar className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No compliance entries found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredCompliance.map((item) => {
                const config = statusConfig[item.status]
                const category = getCategoryFromType(item.compliance_type)
                const Icon = config.icon

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-medium">{item.client?.name}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${categoryColors[category]}`}>
                          {category}
                        </Badge>
                        <span className="text-sm">{item.compliance_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {item.period}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm ${
                        item.status === 'overdue' ? 'text-destructive font-medium' :
                        isToday(new Date(item.due_date)) ? 'text-orange-600 font-medium' : ''
                      }`}>
                        {format(new Date(item.due_date), 'dd MMM yyyy')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.variant} className="gap-1">
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.filed_date ? (
                        <div className="text-sm">
                          <p>{format(new Date(item.filed_date), 'dd MMM yyyy')}</p>
                          {item.arn_number && (
                            <p className="text-xs text-muted-foreground font-mono">
                              {item.arn_number}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {item.status !== 'filed' && (
                            <DropdownMenuItem onClick={() => {
                              setFileItem(item)
                              setShowFileDialog(true)
                            }}>
                              <FileCheck className="mr-2 h-4 w-4" />
                              Mark as Filed
                            </DropdownMenuItem>
                          )}
                          {item.status !== 'in_progress' && item.status !== 'filed' && (
                            <DropdownMenuItem onClick={() => updateStatus(item.id, 'in_progress')}>
                              <Loader className="mr-2 h-4 w-4" />
                              Mark In Progress
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => {
                            setEditItem(item)
                            setShowEditDialog(true)
                          }}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => deleteItem(item.id)}
                            className="text-destructive"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <ComplianceFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        compliance={editItem}
        clients={clients}
      />

      <FileComplianceDialog
        open={showFileDialog}
        onOpenChange={setShowFileDialog}
        compliance={fileItem}
      />
    </div>
  )
}
