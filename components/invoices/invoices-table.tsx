'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Search, 
  MoreHorizontal, 
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  Pencil,
  Trash2,
  IndianRupee
} from 'lucide-react'
import { InvoiceFormDialog } from './invoice-form-dialog'
import { InvoicePreviewDialog } from './invoice-preview-dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { format, isPast } from 'date-fns'
import type { Invoice, Client, TeamMember, InvoiceItem, InvoiceStatus } from '@/lib/types'

interface InvoicesTableProps {
  invoices: (Invoice & { client: Client, items: InvoiceItem[] })[]
  clients: Pick<Client, 'id' | 'name' | 'gstin' | 'address' | 'city' | 'state' | 'pincode'>[]
  teamMembers: TeamMember[]
}

const statusConfig: Record<InvoiceStatus, { label: string, icon: React.ElementType, variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Draft', icon: FileText, variant: 'outline' },
  sent: { label: 'Sent', icon: Send, variant: 'secondary' },
  paid: { label: 'Paid', icon: CheckCircle, variant: 'default' },
  overdue: { label: 'Overdue', icon: AlertCircle, variant: 'destructive' },
  cancelled: { label: 'Cancelled', icon: XCircle, variant: 'outline' },
}

export function InvoicesTable({ invoices, clients, teamMembers }: InvoicesTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all')
  const [editInvoice, setEditInvoice] = useState<(Invoice & { items: InvoiceItem[] }) | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [previewInvoice, setPreviewInvoice] = useState<(Invoice & { client: Client, items: InvoiceItem[] }) | null>(null)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Process overdue status
  const processedInvoices = invoices.map(inv => {
    if (inv.status === 'sent' && isPast(new Date(inv.due_date))) {
      return { ...inv, status: 'overdue' as InvoiceStatus }
    }
    return inv
  })

  const filteredInvoices = processedInvoices.filter(inv => {
    const matchesSearch = 
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.client?.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Summary calculations
  const totalRevenue = processedInvoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + Number(i.total), 0)
  
  const pendingAmount = processedInvoices
    .filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((sum, i) => sum + Number(i.total), 0)

  const statusCounts = processedInvoices.reduce((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1
    return acc
  }, {} as Record<InvoiceStatus, number>)

  async function updateStatus(id: string, newStatus: InvoiceStatus) {
    const updates: Partial<Invoice> = { status: newStatus }
    
    if (newStatus === 'paid') {
      updates.payment_date = new Date().toISOString().split('T')[0]
    }

    const { error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)

    if (error) {
      toast.error('Failed to update status')
      return
    }

    toast.success('Invoice status updated')
    router.refresh()
  }

  async function deleteInvoice(id: string) {
    if (!confirm('Are you sure you want to delete this invoice?')) return

    // Delete items first
    await supabase.from('invoice_items').delete().eq('invoice_id', id)
    
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    
    if (error) {
      toast.error('Failed to delete invoice')
      return
    }

    toast.success('Invoice deleted')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <IndianRupee className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground">Collected</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {pendingAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{processedInvoices.length}</p>
              <p className="text-xs text-muted-foreground">Total Invoices</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statusCounts.overdue || 0}</p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(statusConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
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
              <TableHead>Invoice #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No invoices found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => {
                const config = statusConfig[invoice.status]
                const Icon = config.icon

                return (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <p className="font-mono font-medium text-sm">{invoice.invoice_number}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{invoice.client?.name}</p>
                      {invoice.client?.gstin && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {invoice.client.gstin}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(invoice.invoice_date), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm ${
                        invoice.status === 'overdue' ? 'text-destructive font-medium' : ''
                      }`}>
                        {format(new Date(invoice.due_date), 'dd MMM yyyy')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        {Number(invoice.total).toLocaleString('en-IN', { 
                          style: 'currency', 
                          currency: 'INR',
                          maximumFractionDigits: 0 
                        })}
                      </p>
                      {invoice.tax_amount > 0 && (
                        <p className="text-xs text-muted-foreground">
                          incl. GST {Number(invoice.tax_amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.variant} className="gap-1">
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setPreviewInvoice(invoice)
                            setShowPreviewDialog(true)
                          }}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Invoice
                          </DropdownMenuItem>
                          {invoice.status === 'draft' && (
                            <>
                              <DropdownMenuItem onClick={() => {
                                setEditInvoice(invoice)
                                setShowEditDialog(true)
                              }}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(invoice.id, 'sent')}>
                                <Send className="mr-2 h-4 w-4" />
                                Mark as Sent
                              </DropdownMenuItem>
                            </>
                          )}
                          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                            <DropdownMenuItem onClick={() => updateStatus(invoice.id, 'paid')}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark as Paid
                            </DropdownMenuItem>
                          )}
                          {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
                            <DropdownMenuItem onClick={() => updateStatus(invoice.id, 'cancelled')}>
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel Invoice
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => deleteInvoice(invoice.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
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

      <InvoiceFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        clients={clients}
        invoice={editInvoice || undefined}
      />

      <InvoicePreviewDialog
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        invoice={previewInvoice}
      />
    </div>
  )
}
