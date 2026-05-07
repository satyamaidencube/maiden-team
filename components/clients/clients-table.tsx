'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  DropdownMenuLabel,
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
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, Search, ArrowUpDown, Eye, Pencil, Trash2, X, Download, FileSpreadsheet, FileText } from 'lucide-react'
import { ClientFormDialog } from './client-form-dialog'
import { ClientDetailSheet } from './client-detail-sheet'
import type { Client, EntityType, ClientStatus, TeamMember } from '@/lib/types'

const statusColors: Record<ClientStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  inactive: 'secondary',
  prospect: 'outline',
}

const entityTypeShort: Record<EntityType, string> = {
  'Individual': 'IND',
  'Proprietorship': 'PROP',
  'Partnership': 'PART',
  'LLP': 'LLP',
  'Private Limited': 'PVT',
  'Public Limited': 'PUB',
  'Trust': 'TRUST',
  'HUF': 'HUF',
  'AOP/BOI': 'AOP',
  'Section 8': 'S8',
  'OPC': 'OPC',
}

const statusBadgeVariant = (status: string | null): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (!status) return 'outline'
  const s = status.toLowerCase()
  if (s === 'filed' || s === 'done') return 'default'
  if (s === 'to be done' || s === 'to be filed') return 'secondary'
  if (s === 'not required') return 'outline'
  return 'destructive'
}

interface ClientsTableProps {
  clients: (Client & { assigned_member: TeamMember | null })[]
  teamMembers: TeamMember[]
}

export function ClientsTable({ clients: initialClients, teamMembers }: ClientsTableProps) {
  const [clients, setClients] = useState(initialClients)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [showColumnFilters, setShowColumnFilters] = useState(true)
  
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [showDetailSheet, setShowDetailSheet] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const supabase = createClient()

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return

    const { error } = await supabase.from('clients').delete().eq('id', id)

    if (error) {
      toast.error('Failed to delete client')
      return
    }

    setClients(prev => prev.filter(c => c.id !== id))
    toast.success('Client deleted successfully')
  }

  const handleUpdate = (updatedClient: Client) => {
    setClients(prev => prev.map(c => 
      c.id === updatedClient.id 
        ? { ...updatedClient, assigned_member: teamMembers.find(m => m.id === updatedClient.assigned_to) || null }
        : c
    ))
  }

  // Export functions
  const exportToExcel = useCallback(() => {
    const exportData = clients.map(client => ({
      'Name': client.name,
      'REGN NO': client.registration_number || '',
      'DOI': client.date_of_incorporation ? new Date(client.date_of_incorporation).toLocaleDateString('en-IN') : '',
      'Contact Person': client.contact_person || '',
      'Email': client.email || '',
      'Phone': client.phone || '',
      'Allocated To': client.assigned_member?.full_name || '',
      'Accounting Status': client.accounting_status || '',
      'INC 20A': client.inc_20a_status || '',
      'ADT-1 Status': client.adt1_status || '',
      'ADT-1 Due Date': client.adt1_due_date ? new Date(client.adt1_due_date).toLocaleDateString('en-IN') : '',
      'ADT 1 SRN': client.adt1_srn || '',
      'AOC-4': client.aoc4_status || '',
      'MGT-7A': client.mgt7a_status || '',
      'ITR': client.itr_status || '',
      '3CD': client.form_3cd_status || '',
      'UDIN': client.udin_annual_returns || '',
      'Status': client.status,
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Clients')
    
    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(key.length, ...exportData.map(row => String(row[key as keyof typeof row] || '').length))
    }))
    ws['!cols'] = colWidths

    XLSX.writeFile(wb, `clients_export_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success('Excel file downloaded successfully')
  }, [clients])

  const exportToPDF = useCallback(() => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' })
    
    doc.setFontSize(16)
    doc.text('Clients Report', 14, 15)
    doc.setFontSize(10)
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 22)

    const tableData = clients.map(client => [
      client.name,
      client.registration_number || '-',
      client.date_of_incorporation ? new Date(client.date_of_incorporation).toLocaleDateString('en-IN') : '-',
      client.contact_person || '-',
      client.email || '-',
      client.assigned_member?.full_name || '-',
      client.accounting_status || '-',
      client.inc_20a_status || '-',
      client.adt1_status || '-',
      client.adt1_srn || '-',
      client.status,
    ])

    autoTable(doc, {
      head: [['Name', 'REGN NO', 'DOI', 'Contact', 'Email', 'Allocated To', 'Accounting', 'INC 20A', 'ADT-1', 'ADT 1 SRN', 'Status']],
      body: tableData,
      startY: 28,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [63, 63, 70], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    })

    doc.save(`clients_report_${new Date().toISOString().split('T')[0]}.pdf`)
    toast.success('PDF file downloaded successfully')
  }, [clients])

  const columns: ColumnDef<Client & { assigned_member: TeamMember | null }>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="min-w-[180px]">
          <p className="font-medium text-sm truncate">{row.getValue('name')}</p>
          <p className="text-xs text-muted-foreground truncate">{row.original.contact_person}</p>
        </div>
      ),
    },
    {
      accessorKey: 'registration_number',
      header: 'REGN NO',
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.getValue('registration_number') || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'date_of_incorporation',
      header: 'DOI',
      cell: ({ row }) => {
        const date = row.getValue('date_of_incorporation') as string | null
        return (
          <span className="text-xs">
            {date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-'}
          </span>
        )
      },
    },
    {
      accessorKey: 'email',
      header: 'Contact',
      cell: ({ row }) => (
        <div className="text-xs min-w-[140px]">
          <p className="truncate">{row.original.email || '-'}</p>
          <p className="text-muted-foreground">{row.original.phone}</p>
        </div>
      ),
    },
    {
      accessorKey: 'assigned_member',
      header: 'Allocated To',
      cell: ({ row }) => {
        const member = row.original.assigned_member
        return member ? (
          <span className="text-xs truncate max-w-[80px] block">{member.full_name}</span>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )
      },
    },
    {
      accessorKey: 'accounting_status',
      header: 'Accounting',
      cell: ({ row }) => {
        const status = row.getValue('accounting_status') as string | null
        return (
          <Badge variant={statusBadgeVariant(status)} className="text-xs whitespace-nowrap">
            {status || '-'}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'inc_20a_status',
      header: 'INC 20A',
      cell: ({ row }) => {
        const status = row.getValue('inc_20a_status') as string | null
        return (
          <Badge variant={statusBadgeVariant(status)} className="text-xs">
            {status || '-'}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'adt1_status',
      header: 'ADT-1',
      cell: ({ row }) => {
        const status = row.original.adt1_status
        const date = row.original.adt1_due_date
        return (
          <div className="text-xs">
            <Badge variant={statusBadgeVariant(status)} className="text-xs">
              {status || '-'}
            </Badge>
            {date && <p className="text-muted-foreground mt-0.5">{new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' })}</p>}
          </div>
        )
      },
    },
    {
      accessorKey: 'adt1_srn',
      header: 'ADT 1 SRN',
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.getValue('adt1_srn') || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'aoc4_status',
      header: 'AOC-4',
      cell: ({ row }) => {
        const status = row.getValue('aoc4_status') as string | null
        return status ? (
          <Badge variant={statusBadgeVariant(status)} className="text-xs">
            {status}
          </Badge>
        ) : <span className="text-xs text-muted-foreground">-</span>
      },
    },
    {
      accessorKey: 'mgt7a_status',
      header: 'MGT-7A',
      cell: ({ row }) => {
        const status = row.getValue('mgt7a_status') as string | null
        return status ? (
          <Badge variant={statusBadgeVariant(status)} className="text-xs">
            {status}
          </Badge>
        ) : <span className="text-xs text-muted-foreground">-</span>
      },
    },
    {
      accessorKey: 'itr_status',
      header: 'ITR',
      cell: ({ row }) => {
        const status = row.getValue('itr_status') as string | null
        return status ? (
          <Badge variant={statusBadgeVariant(status)} className="text-xs">
            {status}
          </Badge>
        ) : <span className="text-xs text-muted-foreground">-</span>
      },
    },
    {
      accessorKey: 'form_3cd_status',
      header: '3CD',
      cell: ({ row }) => {
        const status = row.getValue('form_3cd_status') as string | null
        return status ? (
          <Badge variant={statusBadgeVariant(status)} className="text-xs">
            {status}
          </Badge>
        ) : <span className="text-xs text-muted-foreground">-</span>
      },
    },
    {
      accessorKey: 'udin_annual_returns',
      header: 'UDIN',
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.getValue('udin_annual_returns') || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as ClientStatus
        return (
          <Badge variant={statusColors[status]} className="capitalize text-xs">
            {status}
          </Badge>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const client = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                setSelectedClient(client)
                setShowDetailSheet(true)
              }}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setEditClient(client)
                setShowEditDialog(true)
              }}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleDelete(client.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], [])

  const table = useReactTable({
    data: clients,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  })

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search all columns..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showColumnFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowColumnFilters(!showColumnFilters)}
          >
            {showColumnFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          {columnFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setColumnFilters([])
                table.resetColumnFilters()
              }}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear All ({columnFilters.length})
            </Button>
          )}
          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportToExcel}>
                <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF}>
                <FileText className="mr-2 h-4 w-4 text-red-600" />
                Export to PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[1400px]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="align-top">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
            {/* Column Filter Row */}
            {showColumnFilters && (
              <TableRow className="bg-muted/30">
                {table.getHeaderGroups()[0].headers.map((header) => (
                  <TableHead key={`filter-${header.id}`} className="py-2 px-2">
                    {header.id === 'actions' ? null : header.id === 'accounting_status' || header.id === 'inc_20a_status' || header.id === 'adt1_status' || header.id === 'status' ? (
                      <Select
                        value={(header.column.getFilterValue() as string) ?? ''}
                        onValueChange={(value) => {
                          header.column.setFilterValue(value === 'all' ? undefined : value)
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {header.id === 'accounting_status' && (
                            <>
                              <SelectItem value="Not required">Not required</SelectItem>
                              <SelectItem value="To be done">To be done</SelectItem>
                              <SelectItem value="Done">Done</SelectItem>
                            </>
                          )}
                          {header.id === 'inc_20a_status' && (
                            <>
                              <SelectItem value="Filed">Filed</SelectItem>
                              <SelectItem value="Not filed">Not filed</SelectItem>
                              <SelectItem value="To Be Filed">To Be Filed</SelectItem>
                            </>
                          )}
                          {header.id === 'adt1_status' && (
                            <>
                              <SelectItem value="Filed">Filed</SelectItem>
                              <SelectItem value="Not filed">Not filed</SelectItem>
                              <SelectItem value="To Be Filed">To Be Filed</SelectItem>
                              <SelectItem value="Not required">Not required</SelectItem>
                            </>
                          )}
                          {header.id === 'status' && (
                            <>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="prospect">Prospect</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    ) : header.column.getCanFilter() ? (
                      <div className="relative">
                        <Input
                          placeholder="Filter..."
                          value={(header.column.getFilterValue() as string) ?? ''}
                          onChange={(e) => header.column.setFilterValue(e.target.value)}
                          className="h-7 text-xs pr-6"
                        />
                        {header.column.getFilterValue() && (
                          <button
                            onClick={() => header.column.setFilterValue(undefined)}
                            className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ) : null}
                  </TableHead>
                ))}
              </TableRow>
            )}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No clients found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{' '}
          of {table.getFilteredRowModel().rows.length} clients
        </p>
        <div className="flex items-center gap-2">
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / page</SelectItem>
              <SelectItem value="20">20 / page</SelectItem>
              <SelectItem value="50">50 / page</SelectItem>
              <SelectItem value="100">100 / page</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <ClientFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        client={editClient}
        members={teamMembers}
        onSuccess={handleUpdate}
      />

      <ClientDetailSheet
        open={showDetailSheet}
        onOpenChange={setShowDetailSheet}
        client={selectedClient}
        onEdit={() => {
          setShowDetailSheet(false)
          if (selectedClient) {
            setEditClient(selectedClient)
            setShowEditDialog(true)
          }
        }}
      />
    </div>
  )
}
