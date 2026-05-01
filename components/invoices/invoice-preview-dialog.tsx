'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Printer, Download, Building2 } from 'lucide-react'
import { format } from 'date-fns'
import type { Invoice, Client, InvoiceItem, InvoiceStatus } from '@/lib/types'

interface InvoicePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: (Invoice & { client: Client, items: InvoiceItem[] }) | null
}

const statusColors: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-500/10 text-gray-600',
  sent: 'bg-blue-500/10 text-blue-600',
  paid: 'bg-green-500/10 text-green-600',
  overdue: 'bg-red-500/10 text-red-600',
  cancelled: 'bg-gray-500/10 text-gray-600',
}

export function InvoicePreviewDialog({ open, onOpenChange, invoice }: InvoicePreviewDialogProps) {
  if (!invoice) return null

  function handlePrint() {
    const printContent = document.getElementById('invoice-print-content')
    if (!printContent) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoice_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              padding: 40px; 
              color: #1a1a1a;
              line-height: 1.5;
            }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .company-name { font-size: 24px; font-weight: 600; color: #111; }
            .company-details { font-size: 12px; color: #666; margin-top: 4px; }
            .invoice-title { font-size: 28px; font-weight: 700; text-align: right; }
            .invoice-number { font-size: 14px; color: #666; text-align: right; }
            .status { 
              display: inline-block; 
              padding: 4px 12px; 
              border-radius: 4px; 
              font-size: 12px; 
              font-weight: 500;
              text-transform: uppercase;
              margin-top: 8px;
            }
            .status-paid { background: #dcfce7; color: #166534; }
            .status-sent { background: #dbeafe; color: #1e40af; }
            .status-draft { background: #f3f4f6; color: #4b5563; }
            .status-overdue { background: #fee2e2; color: #dc2626; }
            .status-cancelled { background: #f3f4f6; color: #6b7280; }
            .client-section { margin-bottom: 30px; }
            .section-title { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 8px; }
            .client-name { font-size: 16px; font-weight: 600; }
            .client-details { font-size: 13px; color: #444; }
            .dates { display: flex; gap: 40px; margin-bottom: 30px; }
            .date-item { }
            .date-label { font-size: 12px; color: #666; }
            .date-value { font-size: 14px; font-weight: 500; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { 
              background: #f9fafb; 
              padding: 12px; 
              text-align: left; 
              font-size: 12px; 
              font-weight: 600;
              text-transform: uppercase;
              color: #666;
              border-bottom: 2px solid #e5e7eb;
            }
            td { 
              padding: 12px; 
              font-size: 14px; 
              border-bottom: 1px solid #e5e7eb; 
            }
            .text-right { text-align: right; }
            .summary { margin-left: auto; width: 280px; }
            .summary-row { 
              display: flex; 
              justify-content: space-between; 
              padding: 8px 0;
              font-size: 14px;
            }
            .summary-row.total { 
              font-weight: 600; 
              font-size: 18px; 
              border-top: 2px solid #e5e7eb;
              padding-top: 12px;
              margin-top: 8px;
            }
            .notes { 
              margin-top: 40px; 
              padding: 16px; 
              background: #f9fafb; 
              border-radius: 8px;
              font-size: 13px;
            }
            .notes-title { font-weight: 600; margin-bottom: 8px; }
            .footer { 
              margin-top: 60px; 
              text-align: center; 
              font-size: 12px; 
              color: #666;
              border-top: 1px solid #e5e7eb;
              padding-top: 20px;
            }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Invoice Preview</DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </DialogHeader>

        <div id="invoice-print-content" className="space-y-6 p-4 bg-white rounded-lg border">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                  <Building2 className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Maiden Cube Pvt Ltd</h2>
                  <p className="text-xs text-muted-foreground">Chartered Accountants</p>
                </div>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <p>123 Business Park, Sector 5</p>
                <p>Mumbai, Maharashtra 400001</p>
                <p>GSTIN: 27XXXXX1234X1Z5</p>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-bold text-primary">INVOICE</h1>
              <p className="text-sm font-mono text-muted-foreground mt-1">
                {invoice.invoice_number}
              </p>
              <Badge variant="outline" className={`mt-2 ${statusColors[invoice.status]}`}>
                {invoice.status.toUpperCase()}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Client & Dates */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Bill To</p>
              <p className="font-semibold">{invoice.client?.name}</p>
              {invoice.client?.address && (
                <p className="text-sm text-muted-foreground">{invoice.client.address}</p>
              )}
              {invoice.client?.city && (
                <p className="text-sm text-muted-foreground">
                  {invoice.client.city}{invoice.client.state && `, ${invoice.client.state}`}
                  {invoice.client.pincode && ` - ${invoice.client.pincode}`}
                </p>
              )}
              {invoice.client?.gstin && (
                <p className="text-sm text-muted-foreground mt-1 font-mono">
                  GSTIN: {invoice.client.gstin}
                </p>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Invoice Date:</span>
                <span className="text-sm font-medium">
                  {format(new Date(invoice.invoice_date), 'dd MMM yyyy')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Due Date:</span>
                <span className={`text-sm font-medium ${invoice.status === 'overdue' ? 'text-destructive' : ''}`}>
                  {format(new Date(invoice.due_date), 'dd MMM yyyy')}
                </span>
              </div>
              {invoice.payment_date && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Payment Date:</span>
                  <span className="text-sm font-medium text-green-600">
                    {format(new Date(invoice.payment_date), 'dd MMM yyyy')}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                    HSN/SAC
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">
                    Rate
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-4 py-3 text-sm">{item.description}</td>
                    <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                      {item.hsn_sac || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      {Number(item.rate).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {Number(item.amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{Number(invoice.subtotal).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GST ({invoice.tax_rate}%)</span>
                <span>{Number(invoice.tax_amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>{Number(invoice.total).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm font-medium mb-2">Notes / Terms</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground pt-6 border-t">
            <p>Thank you for your business!</p>
            <p className="mt-1">For any queries, contact us at accounts@maidencube.com</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
