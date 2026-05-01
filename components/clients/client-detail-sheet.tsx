'use client'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Building2, Mail, Phone, MapPin, FileText, User } from 'lucide-react'
import type { Client, ClientStatus, EntityType } from '@/lib/types'

interface ClientDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: Client | null
}

const statusColors: Record<ClientStatus, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  inactive: 'secondary',
  prospect: 'outline',
}

const entityTypeShort: Record<EntityType, string> = {
  'Individual': 'IND',
  'Proprietorship': 'PROP',
  'Partnership': 'PART',
  'LLP': 'LLP',
  'Private Limited': 'PVT LTD',
  'Public Limited': 'PUB LTD',
  'Trust': 'TRUST',
  'HUF': 'HUF',
  'AOP/BOI': 'AOP/BOI',
}

export function ClientDetailSheet({ open, onOpenChange, client }: ClientDetailSheetProps) {
  if (!client) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-xl">{client.name}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{entityTypeShort[client.entity_type]}</Badge>
                <Badge variant={statusColors[client.status]} className="capitalize">
                  {client.status}
                </Badge>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Tax Identifiers */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Tax Identifiers
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">PAN</p>
                <p className="font-mono font-medium">{client.pan}</p>
              </div>
              {client.gstin && (
                <div>
                  <p className="text-muted-foreground">GSTIN</p>
                  <p className="font-mono font-medium text-xs">{client.gstin}</p>
                </div>
              )}
              {client.tan && (
                <div>
                  <p className="text-muted-foreground">TAN</p>
                  <p className="font-mono font-medium">{client.tan}</p>
                </div>
              )}
              {client.cin && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">CIN</p>
                  <p className="font-mono font-medium text-xs">{client.cin}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Contact Information
            </h3>
            <div className="space-y-3 text-sm">
              {client.contact_person && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{client.contact_person}</p>
                    <p className="text-xs text-muted-foreground">Contact Person</p>
                  </div>
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{client.email}</p>
                    <p className="text-xs text-muted-foreground">Email</p>
                  </div>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{client.phone}</p>
                    <p className="text-xs text-muted-foreground">Phone</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {(client.address || client.city) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Address
                </h3>
                <div className="text-sm">
                  {client.address && <p>{client.address}</p>}
                  <p>
                    {[client.city, client.state, client.pincode].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            </>
          )}

          {client.notes && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {client.notes}
                </p>
              </div>
            </>
          )}

          <Separator />

          {/* Metadata */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Created: {new Date(client.created_at).toLocaleDateString('en-IN', { 
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}</p>
            <p>Last Updated: {new Date(client.updated_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
