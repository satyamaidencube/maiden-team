'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AgGridReact } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry, ColDef, ICellRendererParams, ValueFormatterParams } from 'ag-grid-community'
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
import { MoreHorizontal, Search, Eye, Pencil, Trash2, Download } from 'lucide-react'
import { ClientFormDialog } from './client-form-dialog'
import { ClientDetailSheet } from './client-detail-sheet'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { exportToExcel, exportToPDF } from '@/lib/export-utils'
import type { Client, TeamMember, ClientStatus } from '@/lib/types'

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule])

interface ClientsTableProps {
  clients: (Client & { assigned_member: TeamMember | null })[]
  teamMembers: TeamMember[]
}

const statusColors: Record<ClientStatus, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  inactive: 'secondary',
  prospect: 'outline',
}

const getStatusBadgeVariant = (status: string | null): 'default' | 'secondary' | 'outline' | 'destructive' => {
  if (!status) return 'outline'
  const s = status.toLowerCase()
  if (s === 'filed' || s === 'done') return 'default'
  if (s === 'to be done' || s === 'to be filed') return 'secondary'
  if (s === 'not required') return 'outline'
  return 'destructive'
}

// Status Badge Cell Renderer
function StatusBadgeCellRenderer(props: ICellRendererParams) {
  const status = props.value
  if (!status) return <span className="text-muted-foreground">-</span>
  return (
    <Badge variant={getStatusBadgeVariant(status)} className="text-xs">
      {status}
    </Badge>
  )
}

// Client Status Badge Cell Renderer
function ClientStatusCellRenderer(props: ICellRendererParams) {
  const status = props.value as ClientStatus
  return (
    <Badge variant={statusColors[status]} className="capitalize text-xs">
      {status}
    </Badge>
  )
}

// ADT-1 Cell Renderer with date
function Adt1CellRenderer(props: ICellRendererParams) {
  const data = props.data as Client
  const status = data.adt1_status
  const date = data.adt1_due_date
  return (
    <div className="text-xs">
      <Badge variant={getStatusBadgeVariant(status)} className="text-xs">
        {status || '-'}
      </Badge>
      {date && (
        <p className="text-muted-foreground mt-0.5">
          {new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' })}
        </p>
      )}
    </div>
  )
}

// Name Cell Renderer
function NameCellRenderer(props: ICellRendererParams) {
  const data = props.data as Client
  return (
    <div>
      <p className="font-medium text-sm truncate">{data.name}</p>
      <p className="text-xs text-muted-foreground truncate">{data.contact_person}</p>
    </div>
  )
}

// Contact Cell Renderer
function ContactCellRenderer(props: ICellRendererParams) {
  const data = props.data as Client
  return (
    <div className="text-xs">
      <p className="truncate">{data.email || '-'}</p>
      <p className="text-muted-foreground">{data.phone}</p>
    </div>
  )
}

// Allocated To Cell Renderer
function AllocatedToCellRenderer(props: ICellRendererParams) {
  const data = props.data as Client & { assigned_member: TeamMember | null }
  const member = data.assigned_member
  return member ? (
    <span className="text-xs truncate block">{member.full_name}</span>
  ) : (
    <span className="text-xs text-muted-foreground">-</span>
  )
}

export function ClientsTable({ clients: initialClients, teamMembers }: ClientsTableProps) {
  const [quickFilterText, setQuickFilterText] = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDetailSheet, setShowDetailSheet] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return

    const { error } = await supabase.from('clients').delete().eq('id', id)
    
    if (error) {
      toast.error('Failed to delete client')
      return
    }

    toast.success('Client deleted')
    router.refresh()
  }, [supabase, router])

  // Actions Cell Renderer
  const ActionsCellRenderer = useCallback((props: ICellRendererParams) => {
    const client = props.data as Client
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
  }, [handleDelete])

  const dateFormatter = (params: ValueFormatterParams) => {
    if (!params.value) return '-'
    return new Date(params.value).toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: '2-digit' 
    })
  }

  const columnDefs: ColDef[] = useMemo(() => [
    {
      field: 'name',
      headerName: 'Name',
      cellRenderer: NameCellRenderer,
      filter: 'agTextColumnFilter',
      minWidth: 200,
      flex: 1,
    },
    {
      field: 'registration_number',
      headerName: 'REGN NO',
      filter: 'agTextColumnFilter',
      minWidth: 180,
      cellClass: 'font-mono text-xs',
    },
    {
      field: 'date_of_incorporation',
      headerName: 'DOI',
      filter: 'agDateColumnFilter',
      valueFormatter: dateFormatter,
      minWidth: 100,
    },
    {
      field: 'email',
      headerName: 'Contact',
      cellRenderer: ContactCellRenderer,
      filter: 'agTextColumnFilter',
      minWidth: 160,
    },
    {
      field: 'assigned_member',
      headerName: 'Allocated To',
      cellRenderer: AllocatedToCellRenderer,
      filter: 'agTextColumnFilter',
      filterValueGetter: (params) => params.data?.assigned_member?.full_name || '',
      minWidth: 120,
    },
    {
      field: 'accounting_status',
      headerName: 'Accounting',
      cellRenderer: StatusBadgeCellRenderer,
      filter: 'agTextColumnFilter',
      filterParams: {
        filterOptions: ['contains', 'equals'],
        maxNumConditions: 1,
      },
      minWidth: 130,
    },
    {
      field: 'inc_20a_status',
      headerName: 'INC 20A',
      cellRenderer: StatusBadgeCellRenderer,
      filter: 'agTextColumnFilter',
      filterParams: {
        filterOptions: ['contains', 'equals'],
        maxNumConditions: 1,
      },
      minWidth: 110,
    },
    {
      field: 'adt1_status',
      headerName: 'ADT-1',
      cellRenderer: Adt1CellRenderer,
      filter: 'agTextColumnFilter',
      filterParams: {
        filterOptions: ['contains', 'equals'],
        maxNumConditions: 1,
      },
      minWidth: 120,
    },
    {
      field: 'adt1_srn',
      headerName: 'ADT 1 SRN',
      filter: 'agTextColumnFilter',
      minWidth: 120,
      cellClass: 'font-mono text-xs',
      valueFormatter: (params) => params.value || '-',
    },
    {
      field: 'aoc4_status',
      headerName: 'AOC-4',
      cellRenderer: StatusBadgeCellRenderer,
      filter: 'agTextColumnFilter',
      minWidth: 100,
    },
    {
      field: 'mgt7a_status',
      headerName: 'MGT-7A',
      cellRenderer: StatusBadgeCellRenderer,
      filter: 'agTextColumnFilter',
      minWidth: 100,
    },
    {
      field: 'itr_status',
      headerName: 'ITR',
      cellRenderer: StatusBadgeCellRenderer,
      filter: 'agTextColumnFilter',
      minWidth: 80,
    },
    {
      field: 'form_3cd_status',
      headerName: '3CD',
      cellRenderer: StatusBadgeCellRenderer,
      filter: 'agTextColumnFilter',
      minWidth: 80,
    },
    {
      field: 'udin_annual_returns',
      headerName: 'UDIN',
      filter: 'agTextColumnFilter',
      minWidth: 120,
      cellClass: 'font-mono text-xs',
      valueFormatter: (params) => params.value || '-',
    },
    {
      field: 'status',
      headerName: 'Status',
      cellRenderer: ClientStatusCellRenderer,
      filter: 'agTextColumnFilter',
      filterParams: {
        filterOptions: ['contains', 'equals'],
        maxNumConditions: 1,
      },
      minWidth: 100,
    },
    {
      headerName: '',
      cellRenderer: ActionsCellRenderer,
      sortable: false,
      filter: false,
      resizable: false,
      width: 60,
      pinned: 'right',
    },
  ], [ActionsCellRenderer])

  const defaultColDef: ColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
    floatingFilter: true,
    suppressHeaderMenuButton: false,
  }), [])

  return (
    <div className="space-y-4">
      {/* Header with Export */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Quick search..."
            value={quickFilterText}
            onChange={(e) => setQuickFilterText(e.target.value)}
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {initialClients.length} client(s)
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Export as</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              exportToExcel(initialClients, `clients_${new Date().toISOString().split('T')[0]}.xlsx`)
              toast.success('Exported to Excel')
            }}>
              <span>Excel (.xlsx)</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              exportToPDF(initialClients, `clients_${new Date().toISOString().split('T')[0]}.pdf`)
              toast.success('PDF opened in print dialog')
            }}>
              <span>PDF</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* AG Grid */}
      <div className="ag-theme-quartz rounded-md border" style={{ height: 600 }}>
        <AgGridReact
          rowData={initialClients}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          quickFilterText={quickFilterText}
          pagination={true}
          paginationPageSize={20}
          paginationPageSizeSelector={[10, 20, 50, 100]}
          animateRows={true}
          rowHeight={50}
          headerHeight={40}
          floatingFiltersHeight={35}
          suppressCellFocus={true}
          enableCellTextSelection={true}
        />
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
