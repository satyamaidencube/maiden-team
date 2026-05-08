// Database Types for Firm Management Portal

export type UserRole = 'admin' | 'manager' | 'member';

export type EntityType = 
  | 'Individual' 
  | 'Proprietorship' 
  | 'Partnership' 
  | 'LLP' 
  | 'Private Limited' 
  | 'Public Limited' 
  | 'Trust' 
  | 'HUF' 
  | 'AOP/BOI'
  | 'Section 8'
  | 'OPC';

export type AccountingStatus = 'Not required' | 'To be done' | 'Done';

export type FilingStatus = 'Not filed' | 'Filed' | 'To Be Filed' | 'To be filed' | 'Not required';

export type ClientStatus = 'active' | 'inactive' | 'prospect';

export type ComplianceCategory = 'GST' | 'Income Tax' | 'MCA' | 'TDS' | 'Other';

export type EventFrequency = 'Monthly' | 'Quarterly' | 'Yearly' | 'One-time';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue' | 'filed';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type ComplianceType = 
  | 'GSTR-1' 
  | 'GSTR-3B' 
  | 'GSTR-9' 
  | 'ITR' 
  | 'TDS Return' 
  | 'MCA Annual Return' 
  | 'MCA AOC-4' 
  | 'MCA MGT-7' 
  | 'Other';

export type ComplianceStatus = 'pending' | 'in_progress' | 'filed' | 'overdue';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export type DocumentCategory = 'ITR' | 'GST' | 'TDS' | 'MCA' | 'Agreement' | 'KYC' | 'Other';

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';

// Team Member / Profile
export interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// Client
export interface Client {
  id: string;
  name: string;
  entity_type: EntityType;
  gstin: string | null;
  pan: string | null;
  tan: string | null;
  cin: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  contact_person: string | null;
  status: ClientStatus;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // New compliance fields
  registration_number: string | null;
  date_of_incorporation: string | null;
  accounting_status: AccountingStatus | null;
  inc_20a_status: FilingStatus | null;
  inc_20a_due_date: string | null;
  adt1_status: FilingStatus | null;
  adt1_due_date: string | null;
  adt1_srn: string | null;
  aoc4_status: string | null;
  mgt7a_status: string | null;
  itr_status: string | null;
  form_3cd_status: string | null;
  udin_annual_returns: string | null;
  // Joined fields
  assigned_member?: TeamMember;
}

// Compliance Event (recurring template)
export interface ComplianceEvent {
  id: string;
  name: string;
  category: ComplianceCategory;
  frequency: EventFrequency;
  due_day: number | null;
  due_month: number | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Task
export interface Task {
  id: string;
  client_id: string;
  event_id: string | null;
  title: string;
  description: string | null;
  category: ComplianceCategory;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string;
  assigned_to: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  client?: Client;
  assigned_member?: TeamMember;
  event?: ComplianceEvent;
}

// Compliance Tracker
export interface ComplianceTracker {
  id: string;
  client_id: string;
  compliance_type: ComplianceType;
  period: string;
  due_date: string;
  status: ComplianceStatus;
  filed_date: string | null;
  arn_number: string | null;
  acknowledgement_number: string | null;
  remarks: string | null;
  filed_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  client?: Client;
  filed_by_member?: TeamMember;
}

// Invoice
export interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  status: InvoiceStatus;
  notes: string | null;
  payment_date: string | null;
  payment_method: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  client?: Client;
  items?: InvoiceItem[];
}

// Invoice Item
export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  hsn_sac: string | null;
  quantity: number;
  rate: number;
  amount: number;
  created_at: string;
}

// Document
export interface Document {
  id: string;
  client_id: string;
  name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  category: DocumentCategory | null;
  financial_year: string | null;
  uploaded_by: string | null;
  created_at: string;
  // Joined fields
  client?: Client;
  uploaded_by_member?: TeamMember;
}

// Audit Log
export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: AuditAction;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  user_id: string | null;
  user_email: string | null;
  ip_address: string | null;
  created_at: string;
  // Joined fields
  user?: TeamMember;
}

// Form types for creating/updating
export interface ClientFormData {
  name: string;
  entity_type: EntityType;
  gstin?: string;
  pan?: string;
  tan?: string;
  cin?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  contact_person?: string;
  status: ClientStatus;
  assigned_to?: string;
  notes?: string;
  // New compliance fields
  registration_number?: string;
  date_of_incorporation?: string;
  accounting_status?: AccountingStatus;
  inc_20a_status?: FilingStatus;
  inc_20a_due_date?: string;
  adt1_status?: FilingStatus;
  adt1_due_date?: string;
  adt1_srn?: string;
  aoc4_status?: string;
  mgt7a_status?: string;
  itr_status?: string;
  form_3cd_status?: string;
  udin_annual_returns?: string;
}

export interface TaskFormData {
  client_id: string;
  event_id?: string;
  title: string;
  description?: string;
  category: ComplianceCategory;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string;
  assigned_to?: string;
}

export interface ComplianceEventFormData {
  name: string;
  category: ComplianceCategory;
  frequency: EventFrequency;
  due_day?: number;
  due_month?: number;
  description?: string;
  is_active: boolean;
}

export interface InvoiceFormData {
  client_id: string;
  invoice_date: string;
  due_date: string;
  tax_rate: number;
  notes?: string;
  items: {
    description: string;
    hsn_sac?: string;
    quantity: number;
    rate: number;
  }[];
}

// Dashboard stats
export interface DashboardStats {
  totalClients: number;
  activeClients: number;
  pendingTasks: number;
  overdueTasks: number;
  pendingCompliance: number;
  overdueCompliance: number;
  unpaidInvoices: number;
  totalRevenue: number;
}
