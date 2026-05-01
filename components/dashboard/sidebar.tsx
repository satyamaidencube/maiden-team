'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { TeamMember } from '@/lib/types'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  CalendarCheck,
  FileText,
  FolderOpen,
  History,
  Settings,
  Building2,
} from 'lucide-react'

interface DashboardSidebarProps {
  user: TeamMember
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/dashboard/clients', icon: Users },
  { name: 'Tasks', href: '/dashboard/tasks', icon: ClipboardList },
  { name: 'Compliance', href: '/dashboard/compliance', icon: CalendarCheck },
  { name: 'Invoices', href: '/dashboard/invoices', icon: FileText },
  { name: 'Documents', href: '/dashboard/documents', icon: FolderOpen },
  { name: 'Audit Log', href: '/dashboard/audit', icon: History },
]

const adminNavigation = [
  { name: 'Events Config', href: '/dashboard/events', icon: Settings },
  { name: 'Team', href: '/dashboard/team', icon: Users },
]

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname()
  const isAdmin = user.role === 'admin' || user.role === 'manager'

  return (
    <div className="hidden w-64 flex-shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
          <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-sidebar-foreground">Maiden Cube</h1>
          <p className="text-xs text-sidebar-foreground/60">Firm Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </div>

        {isAdmin && (
          <div className="pt-6">
            <p className="px-3 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50">
              Administration
            </p>
            <div className="mt-2 space-y-1">
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </nav>

      {/* User info */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-sm font-medium text-sidebar-accent-foreground">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {user.full_name}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60 capitalize">
              {user.role}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
