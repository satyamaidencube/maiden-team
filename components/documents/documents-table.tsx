'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
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
  Download, 
  Trash2, 
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  FolderOpen,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { Document, Client, TeamMember, DocumentCategory } from '@/lib/types'

interface DocumentsTableProps {
  documents: (Document & { client: Client, uploaded_by_member: TeamMember | null })[]
  clients: Pick<Client, 'id' | 'name'>[]
}

const categoryColors: Record<DocumentCategory, string> = {
  'ITR': 'bg-green-500/10 text-green-600 border-green-500/20',
  'GST': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'TDS': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'MCA': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'Agreement': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  'KYC': 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  'Other': 'bg-gray-500/10 text-gray-600 border-gray-500/20',
}

function getFileIcon(fileType: string | null) {
  if (!fileType) return File
  if (fileType.includes('pdf')) return FileText
  if (fileType.includes('image')) return FileImage
  if (fileType.includes('sheet') || fileType.includes('excel')) return FileSpreadsheet
  return File
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export function DocumentsTable({ documents, clients }: DocumentsTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const router = useRouter()

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.client?.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesClient = clientFilter === 'all' || doc.client_id === clientFilter
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter

    return matchesSearch && matchesClient && matchesCategory
  })

  async function handleDelete(documentId: string, filePath: string) {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      const response = await fetch('/api/documents/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, filePath }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete')
      }

      toast.success('Document deleted')
      router.refresh()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete document')
    }
  }

  function handleDownload(filePath: string, fileName: string) {
    const link = document.createElement('a')
    link.href = `/api/documents/file?pathname=${encodeURIComponent(filePath)}`
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function handleView(filePath: string) {
    window.open(`/api/documents/file?pathname=${encodeURIComponent(filePath)}`, '_blank')
  }

  // Group documents by client for summary
  const clientCounts = documents.reduce((acc, doc) => {
    const clientName = doc.client?.name || 'Unknown'
    acc[clientName] = (acc[clientName] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FolderOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{documents.length}</p>
              <p className="text-xs text-muted-foreground">Total Documents</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {documents.filter(d => d.file_type?.includes('pdf')).length}
              </p>
              <p className="text-xs text-muted-foreground">PDFs</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <FileImage className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {documents.filter(d => d.file_type?.includes('image')).length}
              </p>
              <p className="text-xs text-muted-foreground">Images</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <FileSpreadsheet className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {Object.keys(clientCounts).length}
              </p>
              <p className="text-xs text-muted-foreground">Clients with Docs</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="ITR">ITR</SelectItem>
              <SelectItem value="GST">GST</SelectItem>
              <SelectItem value="TDS">TDS</SelectItem>
              <SelectItem value="MCA">MCA</SelectItem>
              <SelectItem value="Agreement">Agreement</SelectItem>
              <SelectItem value="KYC">KYC</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>FY</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocuments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <FolderOpen className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No documents found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredDocuments.map((doc) => {
                const FileIcon = getFileIcon(doc.file_type)

                return (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                          <FileIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-sm">{doc.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {doc.file_type?.split('/')[1]?.toUpperCase() || 'Unknown'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{doc.client?.name}</p>
                    </TableCell>
                    <TableCell>
                      {doc.category ? (
                        <Badge variant="outline" className={categoryColors[doc.category as DocumentCategory]}>
                          {doc.category}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {doc.financial_year ? (
                        <Badge variant="outline" className="font-mono text-xs">
                          {doc.financial_year}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatFileSize(doc.file_size)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{format(new Date(doc.created_at), 'dd MMM yyyy')}</p>
                        {doc.uploaded_by_member && (
                          <p className="text-xs text-muted-foreground">
                            by {doc.uploaded_by_member.full_name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(doc.file_path)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(doc.file_path, doc.name)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(doc.id, doc.file_path)}
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
    </div>
  )
}
