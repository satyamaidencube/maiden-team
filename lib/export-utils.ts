'use client'

import { Client, TeamMember } from '@/lib/types'
import * as XLSX from 'xlsx'

interface ExportData extends Client {
  assigned_member: TeamMember | null
}

export function exportToExcel(clients: ExportData[], filename: string = 'clients.xlsx') {
  const data = clients.map(client => ({
    'Client Name': client.name,
    'Registration No': client.registration_number || '-',
    'DOI': client.date_of_incorporation ? new Date(client.date_of_incorporation).toLocaleDateString('en-IN') : '-',
    'Contact Person': client.contact_person || '-',
    'Email': client.email || '-',
    'Phone': client.phone || '-',
    'Allocated To': client.assigned_member?.full_name || '-',
    'Accounting Status': client.accounting_status || '-',
    'INC 20A': client.inc_20a_status || '-',
    'INC 20A Due': client.inc_20a_due_date ? new Date(client.inc_20a_due_date).toLocaleDateString('en-IN') : '-',
    'ADT-1 Status': client.adt1_status || '-',
    'ADT-1 Due': client.adt1_due_date ? new Date(client.adt1_due_date).toLocaleDateString('en-IN') : '-',
    'ADT-1 SRN': client.adt1_srn || '-',
    'AOC-4': client.aoc4_status || '-',
    'MGT-7A': client.mgt7a_status || '-',
    'ITR': client.itr_status || '-',
    '3CD': client.form_3cd_status || '-',
    'UDIN': client.udin_annual_returns || '-',
    'Status': client.status,
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  
  // Set column widths
  const colWidths = [
    { wch: 25 }, // Client Name
    { wch: 18 }, // Registration No
    { wch: 12 }, // DOI
    { wch: 15 }, // Contact Person
    { wch: 20 }, // Email
    { wch: 12 }, // Phone
    { wch: 15 }, // Allocated To
    { wch: 16 }, // Accounting Status
    { wch: 12 }, // INC 20A
    { wch: 12 }, // INC 20A Due
    { wch: 12 }, // ADT-1 Status
    { wch: 12 }, // ADT-1 Due
    { wch: 12 }, // ADT-1 SRN
    { wch: 10 }, // AOC-4
    { wch: 10 }, // MGT-7A
    { wch: 10 }, // ITR
    { wch: 10 }, // 3CD
    { wch: 12 }, // UDIN
    { wch: 10 }, // Status
  ]
  
  worksheet['!cols'] = colWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients')
  XLSX.writeFile(workbook, filename)
}

export function exportToPDF(clients: ExportData[], filename: string = 'clients.pdf') {
  // Create CSV-like format and convert to PDF using browser's print functionality
  const headers = [
    'Client Name',
    'REGN NO',
    'DOI',
    'Contact Person',
    'Email',
    'Allocated To',
    'Accounting',
    'INC 20A',
    'ADT-1',
    'ADT 1 SRN',
    'Status',
  ]

  const rows = clients.map(client => [
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

  // Create HTML table
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Clients Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #f0f0f0; padding: 10px; text-align: left; border: 1px solid #ddd; font-weight: bold; }
        td { padding: 8px; border: 1px solid #ddd; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .header { font-size: 14px; color: #666; margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <h1>Clients Report</h1>
      <div class="header">Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}</div>
      <table>
        <thead>
          <tr>
            ${headers.map(h => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              ${row.map(cell => `<td>${cell}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top: 20px; text-align: right; color: #999; font-size: 12px;">
        Total Records: ${clients.length}
      </div>
    </body>
    </html>
  `

  const printWindow = window.open('', '', 'height=600,width=800')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.print()
  }
}
