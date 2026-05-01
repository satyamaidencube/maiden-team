import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  ClipboardList, 
  AlertTriangle, 
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  CalendarCheck,
} from 'lucide-react'
import { formatDistanceToNow, format, isPast, isToday } from 'date-fns'
import Link from 'next/link'
import type { Task, ComplianceTracker, Client } from '@/lib/types'

async function getDashboardStats() {
  const supabase = await createClient()

  const [
    { count: totalClients },
    { count: activeClients },
    { data: tasks },
    { data: compliance },
    { data: invoices },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('tasks').select('*, client:clients(name)').in('status', ['pending', 'in_progress', 'overdue']).order('due_date', { ascending: true }).limit(10),
    supabase.from('compliance_tracker').select('*, client:clients(name)').in('status', ['pending', 'in_progress', 'overdue']).order('due_date', { ascending: true }).limit(10),
    supabase.from('invoices').select('total, status'),
  ])

  const pendingTasks = tasks?.filter(t => t.status === 'pending' || t.status === 'in_progress').length || 0
  const overdueTasks = tasks?.filter(t => t.status === 'overdue' || (isPast(new Date(t.due_date)) && t.status !== 'completed' && t.status !== 'filed')).length || 0
  
  const pendingCompliance = compliance?.filter(c => c.status === 'pending' || c.status === 'in_progress').length || 0
  const overdueCompliance = compliance?.filter(c => c.status === 'overdue' || (isPast(new Date(c.due_date)) && c.status !== 'filed')).length || 0

  const unpaidInvoices = invoices?.filter(i => i.status === 'sent' || i.status === 'overdue').length || 0
  const totalRevenue = invoices?.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.total), 0) || 0

  return {
    totalClients: totalClients || 0,
    activeClients: activeClients || 0,
    pendingTasks,
    overdueTasks,
    pendingCompliance,
    overdueCompliance,
    unpaidInvoices,
    totalRevenue,
    recentTasks: tasks || [],
    recentCompliance: compliance || [],
  }
}

function getStatusColor(status: string, dueDate: string) {
  if (status === 'overdue' || (isPast(new Date(dueDate)) && status !== 'completed' && status !== 'filed')) {
    return 'destructive'
  }
  if (status === 'completed' || status === 'filed') {
    return 'default'
  }
  if (isToday(new Date(dueDate))) {
    return 'secondary'
  }
  return 'outline'
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'urgent': return 'destructive'
    case 'high': return 'secondary'
    case 'medium': return 'outline'
    default: return 'outline'
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  const statCards = [
    {
      title: 'Total Clients',
      value: stats.totalClients,
      subtitle: `${stats.activeClients} active`,
      icon: Users,
      href: '/dashboard/clients',
    },
    {
      title: 'Pending Tasks',
      value: stats.pendingTasks,
      subtitle: stats.overdueTasks > 0 ? `${stats.overdueTasks} overdue` : 'All on track',
      icon: ClipboardList,
      href: '/dashboard/tasks',
      alert: stats.overdueTasks > 0,
    },
    {
      title: 'Compliance Pending',
      value: stats.pendingCompliance,
      subtitle: stats.overdueCompliance > 0 ? `${stats.overdueCompliance} overdue` : 'All filed',
      icon: CalendarCheck,
      href: '/dashboard/compliance',
      alert: stats.overdueCompliance > 0,
    },
    {
      title: 'Unpaid Invoices',
      value: stats.unpaidInvoices,
      subtitle: `₹${stats.totalRevenue.toLocaleString('en-IN')} collected`,
      icon: FileText,
      href: '/dashboard/invoices',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your firm&apos;s operations
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.alert ? 'text-destructive' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{stat.value}</span>
                  {stat.alert && <AlertTriangle className="h-4 w-4 text-destructive" />}
                </div>
                <p className={`text-xs ${stat.alert ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {stat.subtitle}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Upcoming Tasks</CardTitle>
              <CardDescription>Tasks requiring attention</CardDescription>
            </div>
            <Link href="/dashboard/tasks" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No pending tasks</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentTasks.slice(0, 5).map((task: Task & { client: Client }) => (
                  <div key={task.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{task.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {task.client?.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                        {task.priority}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(task.due_date), 'MMM d')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compliance Deadlines */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Compliance Deadlines</CardTitle>
              <CardDescription>Upcoming statutory filings</CardDescription>
            </div>
            <Link href="/dashboard/compliance" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentCompliance.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <TrendingUp className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">All compliance up to date</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentCompliance.slice(0, 5).map((item: ComplianceTracker & { client: Client }) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{item.compliance_type}</p>
                        <Badge variant="outline" className="text-xs">
                          {item.period}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.client?.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusColor(item.status, item.due_date)} className="text-xs">
                        {item.status}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(item.due_date), 'MMM d')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
