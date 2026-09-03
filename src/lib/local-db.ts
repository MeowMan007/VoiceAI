/**
 * Local DB — localStorage-backed data store.
 * Replaces Supabase for demo/offline usage.
 * Supports businesses, workflows, and calls with full CRUD.
 */

export interface Business {
  id: string
  name: string
  type: string
  phone?: string
  email?: string
  description?: string
  greeting?: string
  language?: string
  userId: string
  createdAt: string
  updatedAt: string
}

export interface WorkflowStep {
  id: string
  type: 'collect' | 'confirm' | 'action' | 'end'
  label: string
  prompt?: string
  field?: string
}

export interface Workflow {
  id: string
  businessId: string
  name: string
  useCase: string
  steps: WorkflowStep[]
  followUpAction: string
  isActive: boolean
  userId: string
  createdAt: string
  updatedAt: string
}

export interface CallRecord {
  id: string
  businessId: string
  workflowId?: string
  callerName?: string
  callerPhone?: string
  summary?: string
  transcript?: string
  status: 'completed' | 'missed' | 'in-progress'
  duration?: number
  toolsUsed?: string[]
  userId: string
  createdAt: string
}

const KEYS = {
  businesses: 'voiceai_businesses',
  workflows: 'voiceai_workflows',
  calls: 'voiceai_calls',
  seeded: 'voiceai_seeded',
}

function read<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}

function write<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data))
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

/** Seed demo data once per browser */
export function seedIfNeeded(userId: string) {
  if (typeof window === 'undefined') return
  const alreadySeeded = localStorage.getItem(KEYS.seeded)
  if (alreadySeeded) return

  const now = new Date().toISOString()

  const businesses: Business[] = [
    {
      id: 'biz_bakery',
      name: 'Sweet Delights Bakery',
      type: 'Bakery',
      phone: '+91 98765 43210',
      email: 'hello@sweetdelights.com',
      description: 'Custom cakes and pastries for all occasions',
      greeting: 'Thank you for calling Sweet Delights Bakery! We specialise in custom cakes and pastries.',
      language: 'en',
      userId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'biz_clinic',
      name: 'Apex Family Clinic',
      type: 'Healthcare',
      phone: '+91 98765 11111',
      email: 'appointments@apexclinic.com',
      description: 'General practice and family medicine',
      greeting: 'Thank you for calling Apex Family Clinic. How can I assist you today?',
      language: 'en',
      userId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'biz_delivery',
      name: 'FastTrack Logistics',
      type: 'Delivery',
      phone: '+91 99887 76655',
      email: 'support@fasttrack.com',
      description: 'Same-day and next-day delivery services',
      greeting: 'FastTrack Logistics here! How can I help you with your delivery today?',
      language: 'en',
      userId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'biz_realestate',
      name: 'Prime Properties',
      type: 'Real Estate',
      phone: '+91 88776 65544',
      email: 'info@primeproperties.com',
      description: 'Residential and commercial property consultants',
      greeting: 'Welcome to Prime Properties! Are you looking to buy, sell, or rent a property?',
      language: 'en',
      userId,
      createdAt: now,
      updatedAt: now,
    },
  ]

  const workflows: Workflow[] = [
    {
      id: 'wf_bakery_order',
      businessId: 'biz_bakery',
      name: 'Cake Order Collection',
      useCase: 'missed_call_follow_up',
      steps: [
        { id: 's1', type: 'collect', label: 'Customer Name', prompt: 'May I have your name?', field: 'name' },
        { id: 's2', type: 'collect', label: 'Order Type', prompt: 'What type of cake are you ordering?', field: 'order_type' },
        { id: 's3', type: 'collect', label: 'Delivery Date', prompt: 'When do you need it?', field: 'delivery_date' },
        { id: 's4', type: 'action', label: 'Book Calendar', prompt: 'Book the order in calendar' },
        { id: 's5', type: 'end', label: 'Confirm', prompt: 'Thank you! We will confirm your order shortly.' },
      ],
      followUpAction: 'calendar',
      isActive: true,
      userId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'wf_clinic_appt',
      businessId: 'biz_clinic',
      name: 'Appointment Booking',
      useCase: 'appointment_booking',
      steps: [
        { id: 's1', type: 'collect', label: 'Patient Name', prompt: 'What is the patient name?', field: 'name' },
        { id: 's2', type: 'collect', label: 'Reason for Visit', prompt: 'What is the reason for your visit?', field: 'reason' },
        { id: 's3', type: 'collect', label: 'Preferred Date', prompt: 'What date and time works for you?', field: 'date' },
        { id: 's4', type: 'action', label: 'Schedule Appointment', prompt: 'Booking your appointment' },
        { id: 's5', type: 'end', label: 'Confirm', prompt: 'Your appointment is confirmed. See you soon!' },
      ],
      followUpAction: 'calendar',
      isActive: true,
      userId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'wf_delivery_track',
      businessId: 'biz_delivery',
      name: 'Order Status Lookup',
      useCase: 'order_status',
      steps: [
        { id: 's1', type: 'collect', label: 'Order Number', prompt: 'Please provide your order number.', field: 'order_id' },
        { id: 's2', type: 'action', label: 'Lookup Order', prompt: 'Checking your delivery status' },
        { id: 's3', type: 'end', label: 'Status Report', prompt: 'Your order status has been shared.' },
      ],
      followUpAction: 'sms',
      isActive: true,
      userId,
      createdAt: now,
      updatedAt: now,
    },
  ]

  const calls: CallRecord[] = [
    {
      id: 'call_001',
      businessId: 'biz_bakery',
      workflowId: 'wf_bakery_order',
      callerName: 'Priya Sharma',
      callerPhone: '+91 98000 11111',
      summary: 'Custom birthday cake for 2kg chocolate cake, delivery on Saturday.',
      status: 'completed',
      duration: 180,
      toolsUsed: ['Google Calendar'],
      userId,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'call_002',
      businessId: 'biz_clinic',
      workflowId: 'wf_clinic_appt',
      callerName: 'Rahul Mehta',
      callerPhone: '+91 98000 22222',
      summary: 'Appointment booked for general check-up, tomorrow at 10 AM.',
      status: 'completed',
      duration: 240,
      toolsUsed: ['Google Calendar'],
      userId,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'call_003',
      businessId: 'biz_delivery',
      workflowId: 'wf_delivery_track',
      callerName: 'Anjali Patel',
      callerPhone: '+91 98000 33333',
      summary: 'Order ORD-4521 is out for delivery, expected by 6 PM.',
      status: 'completed',
      duration: 90,
      toolsUsed: ['Order Lookup'],
      userId,
      createdAt: new Date(Date.now() - 10800000).toISOString(),
    },
    {
      id: 'call_004',
      businessId: 'biz_realestate',
      callerName: 'Unknown Caller',
      callerPhone: '+91 98000 44444',
      summary: 'Missed call — no voicemail left.',
      status: 'missed',
      userId,
      createdAt: new Date(Date.now() - 14400000).toISOString(),
    },
  ]

  write(KEYS.businesses, businesses)
  write(KEYS.workflows, workflows)
  write(KEYS.calls, calls)
  localStorage.setItem(KEYS.seeded, '1')
}

// ─── Businesses ───────────────────────────────────────────────────────────────

export const localDB = {
  businesses: {
    list(userId: string): Business[] {
      return read<Business>(KEYS.businesses).filter(b => b.userId === userId)
    },
    get(id: string): Business | null {
      return read<Business>(KEYS.businesses).find(b => b.id === id) ?? null
    },
    create(data: Omit<Business, 'id' | 'createdAt' | 'updatedAt'>): Business {
      const all = read<Business>(KEYS.businesses)
      const item: Business = {
        ...data,
        id: 'biz_' + uid(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      write(KEYS.businesses, [...all, item])
      return item
    },
    update(id: string, data: Partial<Business>): Business | null {
      const all = read<Business>(KEYS.businesses)
      const idx = all.findIndex(b => b.id === id)
      if (idx === -1) return null
      all[idx] = { ...all[idx], ...data, updatedAt: new Date().toISOString() }
      write(KEYS.businesses, all)
      return all[idx]
    },
    delete(id: string) {
      write(KEYS.businesses, read<Business>(KEYS.businesses).filter(b => b.id !== id))
    },
  },

  workflows: {
    list(userId: string): Workflow[] {
      return read<Workflow>(KEYS.workflows).filter(w => w.userId === userId)
    },
    listByBusiness(businessId: string): Workflow[] {
      return read<Workflow>(KEYS.workflows).filter(w => w.businessId === businessId)
    },
    get(id: string): Workflow | null {
      return read<Workflow>(KEYS.workflows).find(w => w.id === id) ?? null
    },
    create(data: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Workflow {
      const all = read<Workflow>(KEYS.workflows)
      const item: Workflow = {
        ...data,
        id: 'wf_' + uid(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      write(KEYS.workflows, [...all, item])
      return item
    },
    update(id: string, data: Partial<Workflow>): Workflow | null {
      const all = read<Workflow>(KEYS.workflows)
      const idx = all.findIndex(w => w.id === id)
      if (idx === -1) return null
      all[idx] = { ...all[idx], ...data, updatedAt: new Date().toISOString() }
      write(KEYS.workflows, all)
      return all[idx]
    },
    delete(id: string) {
      write(KEYS.workflows, read<Workflow>(KEYS.workflows).filter(w => w.id !== id))
    },
  },

  calls: {
    list(userId: string): CallRecord[] {
      return read<CallRecord>(KEYS.calls)
        .filter(c => c.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    },
    get(id: string): CallRecord | null {
      return read<CallRecord>(KEYS.calls).find(c => c.id === id) ?? null
    },
    create(data: Omit<CallRecord, 'id' | 'createdAt'>): CallRecord {
      const all = read<CallRecord>(KEYS.calls)
      const item: CallRecord = {
        ...data,
        id: 'call_' + uid(),
        createdAt: new Date().toISOString(),
      }
      write(KEYS.calls, [...all, item])
      return item
    },
    update(id: string, data: Partial<CallRecord>): CallRecord | null {
      const all = read<CallRecord>(KEYS.calls)
      const idx = all.findIndex(c => c.id === id)
      if (idx === -1) return null
      all[idx] = { ...all[idx], ...data }
      write(KEYS.calls, all)
      return all[idx]
    },
    delete(id: string) {
      write(KEYS.calls, read<CallRecord>(KEYS.calls).filter(c => c.id !== id))
    },
    stats(userId: string) {
      const calls = localDB.calls.list(userId)
      return {
        total: calls.length,
        completed: calls.filter(c => c.status === 'completed').length,
        missed: calls.filter(c => c.status === 'missed').length,
        today: calls.filter(c => {
          const d = new Date(c.createdAt)
          const now = new Date()
          return d.getDate() === now.getDate() && d.getMonth() === now.getMonth()
        }).length,
      }
    },
  },
}
