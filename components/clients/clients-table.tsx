'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
  getPaginationRowModel,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { MoreHorizontal, Search, ArrowUpDown, Eye, Pencil, Trash2 } from 'lucide-react'
import { ClientFormDialog } from './client-form-dialog'
import { ClientDetailSheet } from './client-detail-sheet'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Client, TeamMember, EntityType, ClientStatus } from '@/lib/types'

interface ClientsTableProps {
  clients: (Client & { assigned_member: TeamMember | null })[]
  teamMembers: TeamMember[]
}

const statusColors: Record<ClientStatus, 'default' | 'secondary' | 'outline'> = {
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

const statusBadgeVariant = (status: string | null) => {
  if (!status) return 'outline'
  const s = status.toLowerCase()
  if (s === 'filed' || s === 'done') return 'default'
  if (s === 'to be done' || s === 'to be filed' || s === 'to be filed') return 'secondary'
  if (s === 'not required') return 'outline'
  return 'destructive'
}

export function ClientsTable({ clients: initialClients, teamMembers }: ClientsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDetailSheet, setShowDetailSheet] = useState(false)
  const router = useRouter()
  const supabase = createClient()

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

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this client?')) return

    const { error } = await supabase.from('clients').delete().eq('id', id)
    
    if (error) {
      toast.error('Failed to delete client')
      return
    }

    toast.success('Client deleted')
    router.refresh()
  }

  const table = useReactTable({
    data: initialClients,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={(columnFilters.find(f => f.id === 'status')?.value as string) ?? 'all'}
            onValueChange={(value) => {
              if (value === 'all') {
                setColumnFilters(prev => prev.filter(f => f.id !== 'status'))
              } else {
                setColumnFilters(prev => [
                  ...prev.filter(f => f.id !== 'status'),
                  { id: 'status', value }
                ])
              }
            }}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={(columnFilters.find(f => f.id === 'entity_type')?.value as string) ?? 'all'}
            onValueChange={(value) => {
              if (value === 'all') {
                setColumnFilters(prev => prev.filter(f => f.id !== 'entity_type'))
              } else {
                setColumnFilters(prev => [
                  ...prev.filter(f => f.id !== 'entity_type'),
                  { id: 'entity_type', value }
                ])
              }
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Entity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Individual">Individual</SelectItem>
              <SelectItem value="Proprietorship">Proprietorship</SelectItem>
              <SelectItem value="Partnership">Partnership</SelectItem>
              <SelectItem value="LLP">LLP</SelectItem>
              <SelectItem value="Private Limited">Private Limited</SelectItem>
              <SelectItem value="Public Limited">Public Limited</SelectItem>
              <SelectItem value="Trust">Trust</SelectItem>
              <SelectItem value="HUF">HUF</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[1400px]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
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
          {table.getFilteredRowModel().rows.length} client(s)
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </span>
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

      {/* Edit Dialog */}
      <ClientFormDialog 
        open={showEditDialog} 
        onOpenChange={setShowEditDialog}
        client={editClient}
        teamMembers={teamMembers}
      />

      {/* Detail Sheet */}
      <ClientDetailSheet
        open={showDetailSheet}
        onOpenChange={setShowDetailSheet}
        client={selectedClient}
      />
    </div>
  )
}
