import { createClient } from '@/lib/supabase/server'
import { DocumentsHeader } from '@/components/documents/documents-header'
import { DocumentsTable } from '@/components/documents/documents-table'
import type { Document, Client, TeamMember } from '@/lib/types'

async function getData() {
  const supabase = await createClient()
  
  const [documentsResult, clientsResult] = await Promise.all([
    supabase
      .from('documents')
      .select('*, client:clients(*), uploaded_by_member:team_members!documents_uploaded_by_fkey(*)')
      .order('created_at', { ascending: false }),
    supabase
      .from('clients')
      .select('id, name')
      .eq('status', 'active')
      .order('name'),
  ])

  return {
    documents: (documentsResult.data || []) as (Document & { 
      client: Client, 
      uploaded_by_member: TeamMember | null 
    })[],
    clients: clientsResult.data || [],
  }
}

export default async function DocumentsPage() {
  const { documents, clients } = await getData()

  return (
    <div className="space-y-6">
      <DocumentsHeader clients={clients} />
      <DocumentsTable 
        documents={documents} 
        clients={clients}
      />
    </div>
  )
}
