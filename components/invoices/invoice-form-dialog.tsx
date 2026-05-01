'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { format, addDays } from 'date-fns'
import type { Client, Invoice, InvoiceItem } from '@/lib/types'

const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  hsn_sac: z.string().optional(),
  quantity: z.coerce.number().min(1, 'Min 1'),
  rate: z.coerce.number().min(0, 'Min 0'),
})

const invoiceFormSchema = z.object({
  client_id: z.string().min(1, 'Select a client'),
  invoice_date: z.string().min(1, 'Invoice date is required'),
  due_date: z.string().min(1, 'Due date is required'),
  tax_rate: z.coerce.number().min(0).max(100),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, 'Add at least one item'),
})

type InvoiceFormData = z.infer<typeof invoiceFormSchema>

interface InvoiceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clients: Pick<Client, 'id' | 'name' | 'gstin' | 'address' | 'city' | 'state' | 'pincode'>[]
  invoice?: Invoice & { items: InvoiceItem[] }
}

export function InvoiceFormDialog({ open, onOpenChange, clients, invoice }: InvoiceFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const isEditing = !!invoice

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      client_id: '',
      invoice_date: format(new Date(), 'yyyy-MM-dd'),
      due_date: format(addDays(new Date(), 15), 'yyyy-MM-dd'),
      tax_rate: 18,
      notes: '',
      items: [{ description: '', hsn_sac: '', quantity: 1, rate: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  useEffect(() => {
    if (invoice) {
      form.reset({
        client_id: invoice.client_id,
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date,
        tax_rate: invoice.tax_rate,
        notes: invoice.notes || '',
        items: invoice.items.map(item => ({
          description: item.description,
          hsn_sac: item.hsn_sac || '',
          quantity: item.quantity,
          rate: item.rate,
        })),
      })
    } else {
      form.reset({
        client_id: '',
        invoice_date: format(new Date(), 'yyyy-MM-dd'),
        due_date: format(addDays(new Date(), 15), 'yyyy-MM-dd'),
        tax_rate: 18,
        notes: '',
        items: [{ description: '', hsn_sac: '', quantity: 1, rate: 0 }],
      })
    }
  }, [invoice, form, open])

  const watchItems = form.watch('items')
  const watchTaxRate = form.watch('tax_rate')

  const subtotal = watchItems.reduce((sum, item) => {
    return sum + (item.quantity || 0) * (item.rate || 0)
  }, 0)
  const taxAmount = (subtotal * (watchTaxRate || 0)) / 100
  const total = subtotal + taxAmount

  async function generateInvoiceNumber() {
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${year}-01-01`)
    
    const number = String((count || 0) + 1).padStart(4, '0')
    return `MC/${year}${month}/${number}`
  }

  async function onSubmit(values: InvoiceFormData) {
    setIsLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (isEditing) {
        // Update invoice
        const { error: invoiceError } = await supabase
          .from('invoices')
          .update({
            client_id: values.client_id,
            invoice_date: values.invoice_date,
            due_date: values.due_date,
            subtotal,
            tax_rate: values.tax_rate,
            tax_amount: taxAmount,
            total,
            notes: values.notes || null,
          })
          .eq('id', invoice.id)

        if (invoiceError) throw invoiceError

        // Delete existing items
        await supabase.from('invoice_items').delete().eq('invoice_id', invoice.id)

        // Insert new items
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(
            values.items.map(item => ({
              invoice_id: invoice.id,
              description: item.description,
              hsn_sac: item.hsn_sac || null,
              quantity: item.quantity,
              rate: item.rate,
              amount: item.quantity * item.rate,
            }))
          )

        if (itemsError) throw itemsError

        toast.success('Invoice updated')
      } else {
        // Create invoice
        const invoiceNumber = await generateInvoiceNumber()

        const { data: newInvoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            invoice_number: invoiceNumber,
            client_id: values.client_id,
            invoice_date: values.invoice_date,
            due_date: values.due_date,
            subtotal,
            tax_rate: values.tax_rate,
            tax_amount: taxAmount,
            total,
            status: 'draft',
            notes: values.notes || null,
            created_by: user?.id,
          })
          .select()
          .single()

        if (invoiceError) throw invoiceError

        // Insert items
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(
            values.items.map(item => ({
              invoice_id: newInvoice.id,
              description: item.description,
              hsn_sac: item.hsn_sac || null,
              quantity: item.quantity,
              rate: item.rate,
              amount: item.quantity * item.rate,
            }))
          )

        if (itemsError) throw itemsError

        toast.success('Invoice created')
      }

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      toast.error(isEditing ? 'Failed to update invoice' : 'Failed to create invoice')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Invoice' : 'Create Invoice'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update invoice details' : 'Create a new invoice for a client'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Client & Dates */}
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="invoice_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Line Items</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ description: '', hsn_sac: '', quantity: 1, rate: 0 })}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                  <div className="col-span-5">Description</div>
                  <div className="col-span-2">HSN/SAC</div>
                  <div className="col-span-1">Qty</div>
                  <div className="col-span-2">Rate</div>
                  <div className="col-span-2 text-right">Amount</div>
                </div>

                {fields.map((field, index) => {
                  const qty = watchItems[index]?.quantity || 0
                  const rate = watchItems[index]?.rate || 0
                  const amount = qty * rate

                  return (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                      <FormField
                        control={form.control}
                        name={`items.${index}.description`}
                        render={({ field }) => (
                          <FormItem className="col-span-5">
                            <FormControl>
                              <Input placeholder="Service description" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.hsn_sac`}
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormControl>
                              <Input placeholder="998231" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem className="col-span-1">
                            <FormControl>
                              <Input type="number" min={1} {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.rate`}
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormControl>
                              <Input type="number" min={0} {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="col-span-2 flex items-center justify-end gap-2">
                        <span className="text-sm font-medium">
                          {amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                        </span>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <Separator />

            {/* Summary */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="tax_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Rate (%)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={100} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Payment terms, bank details, etc."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2 rounded-lg bg-muted/50 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{subtotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">GST ({watchTaxRate || 0}%)</span>
                  <span>{taxAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span className="text-lg">{total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Update Invoice' : 'Create Invoice'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
