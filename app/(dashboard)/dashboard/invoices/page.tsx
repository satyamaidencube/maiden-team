import { createClient } from '@/lib/supabase/server'
import { InvoicesHeader } from '@/components/invoices/invoices-header'
import { InvoicesTable } from '@/components/invoices/invoices-table'
import type { Invoice, Client, TeamMember, InvoiceItem } from '@/lib/types'

async function getData() {
  const supabase = await createClient()
  
  const [invoicesResult, clientsResult, membersResult] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, client:clients(*), items:invoice_items(*)')
      .order('invoice_date', { ascending: false }),
    supabase
      .from('clients')
      .select('id, name, gstin, address, city, state, pincode')
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('team_members')
      .select('*')
      .order('full_name'),
  ])

  return {
    invoices: (invoicesResult.data || []) as (Invoice & { 
      client: Client, 
      items: InvoiceItem[] 
    })[],
    clients: clientsResult.data || [],
    teamMembers: membersResult.data || [],
  }
}

export default async function InvoicesPage() {
  const { invoices, clients, teamMembers } = await getData()

  return (
    <div className="space-y-6">
      <InvoicesHeader clients={clients} />
      <InvoicesTable 
        invoices={invoices} 
        clients={clients}
        teamMembers={teamMembers}
      />
    </div>
  )
}
