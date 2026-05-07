'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Client, TeamMember, EntityType, ClientStatus } from '@/lib/types'

const entityTypes: EntityType[] = [
  'Individual',
  'Proprietorship',
  'Partnership',
  'LLP',
  'Private Limited',
  'Public Limited',
  'Trust',
  'HUF',
  'AOP/BOI',
  'Section 8',
  'OPC',
]

const clientStatuses: ClientStatus[] = ['active', 'inactive', 'prospect']

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  entity_type: z.enum(['Individual', 'Proprietorship', 'Partnership', 'LLP', 'Private Limited', 'Public Limited', 'Trust', 'HUF', 'AOP/BOI', 'Section 8', 'OPC']),
  pan: z.string().optional(),
  gstin: z.string().optional(),
  tan: z.string().optional(),
  cin: z.string().optional(),
  registration_number: z.string().optional(),
  date_of_incorporation: z.string().optional(),
  accounting_status: z.enum(['Not required', 'To be done', 'Done']).optional(),
  inc_20a_status: z.enum(['Not filed', 'Filed', 'To Be Filed']).optional(),
  inc_20a_due_date: z.string().optional(),
  adt1_status: z.enum(['Not filed', 'Filed', 'To Be Filed', 'To be filed', 'Not required']).optional(),
  adt1_due_date: z.string().optional(),
  adt1_srn: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  contact_person: z.string().optional(),
  status: z.enum(['active', 'inactive', 'prospect']),
  assigned_to: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface ClientFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client?: Client | null
  teamMembers?: TeamMember[]
}

export function ClientFormDialog({ 
  open, 
  onOpenChange, 
  client,
  teamMembers = [],
}: ClientFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [members, setMembers] = useState<TeamMember[]>(teamMembers)
  const router = useRouter()
  const supabase = createClient()
  const isEditing = !!client

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      entity_type: 'Private Limited',
      pan: '',
      gstin: '',
      tan: '',
      cin: '',
      registration_number: '',
      date_of_incorporation: '',
      accounting_status: 'Not required',
      inc_20a_status: 'Not filed',
      inc_20a_due_date: '',
      adt1_status: 'Not filed',
      adt1_due_date: '',
      adt1_srn: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      contact_person: '',
      status: 'active',
      assigned_to: 'unassigned',
      notes: '',
    },
  })

  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name,
        entity_type: client.entity_type,
        pan: client.pan || '',
        gstin: client.gstin || '',
        tan: client.tan || '',
        cin: client.cin || '',
        registration_number: client.registration_number || '',
        date_of_incorporation: client.date_of_incorporation || '',
        accounting_status: client.accounting_status || 'Not required',
        inc_20a_status: client.inc_20a_status || 'Not filed',
        inc_20a_due_date: client.inc_20a_due_date || '',
        adt1_status: client.adt1_status || 'Not filed',
        adt1_due_date: client.adt1_due_date || '',
        adt1_srn: client.adt1_srn || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        pincode: client.pincode || '',
        contact_person: client.contact_person || '',
        status: client.status,
        assigned_to: client.assigned_to || 'unassigned',
        notes: client.notes || '',
      })
    } else {
      form.reset()
    }
  }, [client, form])

  useEffect(() => {
    if (open && teamMembers.length === 0) {
      fetchTeamMembers()
    }
  }, [open])

  async function fetchTeamMembers() {
    const { data } = await supabase
      .from('team_members')
      .select('*')
      .order('full_name')
    
    if (data) {
      setMembers(data)
    }
  }

  async function onSubmit(values: FormValues) {
    setIsLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const clientData = {
        ...values,
        pan: values.pan || null,
        gstin: values.gstin || null,
        tan: values.tan || null,
        cin: values.cin || null,
        registration_number: values.registration_number || null,
        date_of_incorporation: values.date_of_incorporation || null,
        accounting_status: values.accounting_status || null,
        inc_20a_status: values.inc_20a_status || null,
        inc_20a_due_date: values.inc_20a_due_date || null,
        adt1_status: values.adt1_status || null,
        adt1_due_date: values.adt1_due_date || null,
        adt1_srn: values.adt1_srn || null,
        email: values.email || null,
        phone: values.phone || null,
        address: values.address || null,
        city: values.city || null,
        state: values.state || null,
        pincode: values.pincode || null,
        contact_person: values.contact_person || null,
        assigned_to: values.assigned_to === 'unassigned' ? null : (values.assigned_to || null),
        notes: values.notes || null,
        ...(isEditing ? {} : { created_by: user?.id }),
      }

      if (isEditing) {
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', client.id)

        if (error) throw error
        toast.success('Client updated successfully')
      } else {
        const { error } = await supabase
          .from('clients')
          .insert(clientData)

        if (error) throw error
        toast.success('Client created successfully')
      }

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Error saving client:', error)
      toast.error('Failed to save client')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Client' : 'Add New Client'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update client information' : 'Enter client details to add to your portfolio'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Basic Information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="ABC Pvt Ltd" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="entity_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entity Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {entityTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Company Registration */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Company Registration</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="registration_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration No (CIN/LLPIN)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="U72200TG2021PTC155682" 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="date_of_incorporation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Incorporation</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Tax Identifiers */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Tax Identifiers</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="pan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PAN</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="ABCDE1234F" 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            maxLength={10}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gstin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GSTIN</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="22ABCDE1234F1Z5" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            maxLength={15}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>TAN</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="DELA12345E" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            maxLength={10}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CIN</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="L12345MH2020PLC123456" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            maxLength={21}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Contact Information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="contact_person"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+91 98765 43210" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="contact@company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Address</h3>
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="123 Main Street, Suite 100" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Mumbai" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="Maharashtra" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pincode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pincode</FormLabel>
                        <FormControl>
                          <Input placeholder="400001" {...field} maxLength={6} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Compliance Status */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Compliance Status</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="accounting_status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Accounting Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Not required">Not required</SelectItem>
                            <SelectItem value="To be done">To be done</SelectItem>
                            <SelectItem value="Done">Done</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="inc_20a_status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>INC-20A Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Not filed">Not filed</SelectItem>
                            <SelectItem value="Filed">Filed</SelectItem>
                            <SelectItem value="To Be Filed">To Be Filed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="inc_20a_due_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>INC-20A Due Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="adt1_status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ADT-1 Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Not filed">Not filed</SelectItem>
                            <SelectItem value="Filed">Filed</SelectItem>
                            <SelectItem value="To Be Filed">To Be Filed</SelectItem>
                            <SelectItem value="To be filed">To be filed</SelectItem>
                            <SelectItem value="Not required">Not required</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="adt1_due_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ADT-1 Due Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="adt1_srn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ADT-1 SRN</FormLabel>
                        <FormControl>
                          <Input placeholder="T31857188" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Assignment */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Assignment</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clientStatuses.map((status) => (
                              <SelectItem key={status} value={status} className="capitalize">
                                {status}
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
                    name="assigned_to"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign To</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select team member" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {members.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional notes about this client..."
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? 'Save Changes' : 'Add Client'}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
