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
          Client Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.getValue('name')}</p>
          <p className="text-xs text-muted-foreground">{row.original.contact_person}</p>
        </div>
      ),
    },
    {
      accessorKey: 'entity_type',
      header: 'Entity',
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono text-xs">
          {entityTypeShort[row.getValue('entity_type') as EntityType]}
        </Badge>
      ),
    },
    {
      accessorKey: 'pan',
      header: 'PAN',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue('pan')}</span>
      ),
    },
    {
      accessorKey: 'gstin',
      header: 'GSTIN',
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.getValue('gstin') || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Contact',
      cell: ({ row }) => (
        <div className="text-sm">
          <p className="truncate max-w-[160px]">{row.original.email || '-'}</p>
          <p className="text-xs text-muted-foreground">{row.original.phone}</p>
        </div>
      ),
    },
    {
      accessorKey: 'assigned_member',
      header: 'Assigned To',
      cell: ({ row }) => {
        const member = row.original.assigned_member
        return member ? (
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
              {member.full_name.charAt(0)}
            </div>
            <span className="text-sm truncate max-w-[100px]">{member.full_name}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Unassigned</span>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as ClientStatus
        return (
          <Badge variant={statusColors[status]} className="capitalize">
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
      <div className="rounded-md border">
        <Table>
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
