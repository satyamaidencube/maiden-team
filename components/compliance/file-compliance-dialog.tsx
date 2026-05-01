'use client'

import { useState } from 'react'
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
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, FileCheck } from 'lucide-react'
import { format } from 'date-fns'
import type { ComplianceTracker } from '@/lib/types'

const fileFormSchema = z.object({
  filed_date: z.string().min(1, 'Filing date is required'),
  arn_number: z.string().optional(),
  acknowledgement_number: z.string().optional(),
  remarks: z.string().optional(),
})

type FileFormData = z.infer<typeof fileFormSchema>

interface FileComplianceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  compliance: ComplianceTracker | null
}

export function FileComplianceDialog({ open, onOpenChange, compliance }: FileComplianceDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const form = useForm<FileFormData>({
    resolver: zodResolver(fileFormSchema),
    defaultValues: {
      filed_date: format(new Date(), 'yyyy-MM-dd'),
      arn_number: '',
      acknowledgement_number: '',
      remarks: '',
    },
  })

  async function onSubmit(values: FileFormData) {
    if (!compliance) return
    setIsLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('compliance_tracker')
        .update({
          status: 'filed',
          filed_date: values.filed_date,
          arn_number: values.arn_number || null,
          acknowledgement_number: values.acknowledgement_number || null,
          remarks: values.remarks || null,
          filed_by: user?.id,
        })
        .eq('id', compliance.id)

      if (error) throw error

      toast.success('Compliance marked as filed')
      onOpenChange(false)
      form.reset()
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to update compliance')
    } finally {
      setIsLoading(false)
    }
  }

  if (!compliance) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-green-600" />
            Mark as Filed
          </DialogTitle>
          <DialogDescription>
            Record filing details for {compliance.compliance_type} - {compliance.period}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="filed_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Filing Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="arn_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ARN Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., AA1234567890123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="acknowledgement_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acknowledgement Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 123456789012345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any notes about the filing..."
                      rows={2}
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
              <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mark as Filed
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
