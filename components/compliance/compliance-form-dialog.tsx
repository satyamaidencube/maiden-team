'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
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
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { Client, ComplianceTracker, ComplianceType, ComplianceStatus } from '@/lib/types'

const complianceFormSchema = z.object({
  client_id: z.string().min(1, 'Select a client'),
  compliance_type: z.string().min(1, 'Select compliance type'),
  period: z.string().min(1, 'Period is required'),
  due_date: z.string().min(1, 'Due date is required'),
  status: z.enum(['pending', 'in_progress', 'filed', 'overdue']),
  remarks: z.string().optional(),
})

type ComplianceFormData = z.infer<typeof complianceFormSchema>

interface ComplianceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clients: Pick<Client, 'id' | 'name'>[]
  compliance?: ComplianceTracker | null
}

const complianceTypes: ComplianceType[] = [
  'GSTR-1', 'GSTR-3B', 'GSTR-9', 'ITR', 'TDS Return', 
  'MCA Annual Return', 'MCA AOC-4', 'MCA MGT-7', 'Other'
]

export function ComplianceFormDialog({ open, onOpenChange, clients, compliance }: ComplianceFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const isEditing = !!compliance

  const form = useForm<ComplianceFormData>({
    resolver: zodResolver(complianceFormSchema),
    defaultValues: {
      client_id: '',
      compliance_type: '',
      period: '',
      due_date: '',
      status: 'pending',
      remarks: '',
    },
  })

  useEffect(() => {
    if (compliance) {
      form.reset({
        client_id: compliance.client_id,
        compliance_type: compliance.compliance_type,
        period: compliance.period,
        due_date: compliance.due_date,
        status: compliance.status,
        remarks: compliance.remarks || '',
      })
    } else {
      form.reset({
        client_id: '',
        compliance_type: '',
        period: '',
        due_date: '',
        status: 'pending',
        remarks: '',
      })
    }
  }, [compliance, form, open])

  async function onSubmit(values: ComplianceFormData) {
    setIsLoading(true)

    try {
      if (isEditing) {
        const { error } = await supabase
          .from('compliance_tracker')
          .update({
            client_id: values.client_id,
            compliance_type: values.compliance_type,
            period: values.period,
            due_date: values.due_date,
            status: values.status,
            remarks: values.remarks || null,
          })
          .eq('id', compliance.id)

        if (error) throw error
        toast.success('Compliance entry updated')
      } else {
        const { error } = await supabase
          .from('compliance_tracker')
          .insert({
            client_id: values.client_id,
            compliance_type: values.compliance_type,
            period: values.period,
            due_date: values.due_date,
            status: values.status,
            remarks: values.remarks || null,
          })

        if (error) throw error
        toast.success('Compliance entry created')
      }

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      toast.error(isEditing ? 'Failed to update entry' : 'Failed to create entry')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Compliance Entry' : 'Add Compliance Entry'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update compliance tracking details' : 'Track a new compliance deadline'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="compliance_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {complianceTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Apr 2024, Q1 2024-25" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="filed">Filed</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any notes or comments..."
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
