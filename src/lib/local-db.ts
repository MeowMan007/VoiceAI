/**
 * local-db.ts — localStorage-based data store
 * Provides CRUD for businesses, workflows, and calls.
 * Falls back gracefully when localStorage is unavailable (SSR).
 */
import type { Business, Workflow, Call } from '@/types'
import { WORKFLOW_TEMPLATES } from '@/types'

const BIZ_KEY = 'voiceai_businesses'
const WF_KEY = 'voiceai_workflows'
const CALLS_KEY = 'voiceai_calls'
const SEEDED_KEY = 'voiceai_seeded_v1'

// ─── SEED DATA ────────────────────────────────────────────────────────────────

function makeSeedBusinesses(): Business[] {
  return [
    {
      id: 'biz-seed-1',
      owner_id: 'demo',
      name: 'Sweet Delights Bakery',
      type: 'cake_shop',
      phone: '+91 98765 43210',
      description: 'Fresh custom birthday, anniversary, and wedding cakes with same-day express delivery.',
      language: 'en',
      created_at: new Date(Date.now() - 1000 * 3600 * 48).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'biz-seed-2',
      owner_id: 'demo',
      name: 'Apex Family Clinic',
      type: 'clinic',
      phone: '+91 98111 22334',
      description: 'Primary healthcare and patient consultations. Automated appointment booking via Google Calendar.',
      language: 'en',
      created_at: new Date(Date.now() - 1000 * 3600 * 72).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'biz-seed-3',
      owner_id: 'demo',
      name: 'SwiftGo Express Logistics',
      type: 'delivery',
      phone: '+91 99887 76655',
      description: 'Intra-city parcel delivery, live courier status, and package routing support.',
      language: 'en',
      created_at: new Date(Date.now() - 1000 * 3600 * 96).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'biz-seed-4',
      owner_id: 'demo',
      name: 'Prestige Property Realty',
      type: 'real_estate',
      phone: '+91 97654 32100',
      description: 'Residential and commercial real estate advisory, property viewings, and buyer qualification.',
      language: 'en',
      created_at: new Date(Date.now() - 1000 * 3600 * 120).toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
}

function makeSeedWorkflows(): Workflow[] {
  return [
    {
      id: 'wf-seed-1',
      business_id: 'biz-seed-1',
      name: 'Cake Order Intake & Urgency Qualification',
      trigger: 'missed_call',
      greeting: WORKFLOW_TEMPLATES.cake_shop.greeting!,
      closing_message: WORKFLOW_TEMPLATES.cake_shop.closing_message!,
      language: 'en',
      fields: WORKFLOW_TEMPLATES.cake_shop.fields!,
      conditions: WORKFLOW_TEMPLATES.cake_shop.conditions!,
      post_action: 'create_record',
      calendar_enabled: true,
      is_active: true,
      created_at: new Date(Date.now() - 1000 * 3600 * 48).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'wf-seed-2',
      business_id: 'biz-seed-2',
      name: 'Clinic Patient Appointment Booking',
      trigger: 'missed_call',
      greeting: WORKFLOW_TEMPLATES.clinic.greeting!,
      closing_message: WORKFLOW_TEMPLATES.clinic.closing_message!,
      language: 'en',
      fields: WORKFLOW_TEMPLATES.clinic.fields!,
      conditions: WORKFLOW_TEMPLATES.clinic.conditions!,
      post_action: 'create_record',
      calendar_enabled: true,
      is_active: true,
      created_at: new Date(Date.now() - 1000 * 3600 * 72).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'wf-seed-3',
      business_id: 'biz-seed-3',
      name: 'Courier Status & Package Routing',
      trigger: 'missed_call',
      greeting: WORKFLOW_TEMPLATES.delivery.greeting!,
      closing_message: WORKFLOW_TEMPLATES.delivery.closing_message!,
      language: 'en',
      fields: WORKFLOW_TEMPLATES.delivery.fields!,
      conditions: WORKFLOW_TEMPLATES.delivery.conditions!,
      post_action: 'create_record',
      calendar_enabled: false,
      is_active: true,
      created_at: new Date(Date.now() - 1000 * 3600 * 96).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'wf-seed-4',
      business_id: 'biz-seed-4',
      name: 'Property Viewing & Buyer Advisory',
      trigger: 'missed_call',
      greeting: WORKFLOW_TEMPLATES.real_estate.greeting!,
      closing_message: WORKFLOW_TEMPLATES.real_estate.closing_message!,
      language: 'en',
      fields: WORKFLOW_TEMPLATES.real_estate.fields!,
      conditions: WORKFLOW_TEMPLATES.real_estate.conditions!,
      post_action: 'create_record',
      calendar_enabled: true,
      is_active: true,
      created_at: new Date(Date.now() - 1000 * 3600 * 120).toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
}

function makeSeedCalls(): Call[] {
  return [
    {
      id: 'call-seed-1',
      business_id: 'biz-seed-1',
      workflow_id: 'wf-seed-1',
      caller_name: 'Rahul Sharma',
      caller_phone: '+91 98765 43210',
      status: 'in_progress',
      intent: 'Order Custom Chocolate Truffle Cake',
      summary: 'Customer called to order a 1kg chocolate truffle cake for a birthday tomorrow. Delivery requested by 4:00 PM.',
      urgency: 'urgent',
      follow_up_status: 'pending',
      transcript: [
        { role: 'assistant', content: 'Hello, thanks for calling Sweet Delights Bakery. How can I assist you?', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
        { role: 'user', content: 'I need a 1kg chocolate truffle cake urgently for tomorrow afternoon.', timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString() }
      ],
      collected_data: { flavour: 'Chocolate Truffle', weight: '1kg', required_date: 'Tomorrow' },
      language_used: 'en',
      created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'call-seed-2',
      business_id: 'biz-seed-2',
      workflow_id: 'wf-seed-2',
      caller_name: 'Anita Verma',
      caller_phone: '+91 98111 22334',
      status: 'completed',
      intent: 'Doctor Appointment Consultation',
      summary: 'Patient requested appointment for tomorrow at 4 PM. Calendar slot confirmed and follow-up scheduled.',
      urgency: 'normal',
      follow_up_status: 'resolved',
      calendar_event_id: 'cal_event_98231',
      calendar_event_url: 'https://calendar.google.com',
      transcript: [
        { role: 'assistant', content: 'Hello, you have reached Apex Family Clinic. How can I help you today?', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
        { role: 'user', content: 'I would like to book an appointment with Dr. Sharma tomorrow at 4 PM please.', timestamp: new Date(Date.now() - 1000 * 60 * 44).toISOString() }
      ],
      collected_data: { patient_name: 'Anita Verma', doctor_preference: 'Dr. Sharma', preferred_time: '16:00' },
      language_used: 'en',
      created_at: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'call-seed-3',
      business_id: 'biz-seed-3',
      workflow_id: 'wf-seed-3',
      caller_name: 'Vikram Singh',
      caller_phone: '+91 99887 76655',
      status: 'completed',
      intent: 'Package Status Tracking (ORD-101)',
      summary: 'Package ORD-101 status queried. API confirmed: Out for delivery with courier.',
      urgency: 'normal',
      follow_up_status: 'contacted',
      transcript: [
        { role: 'assistant', content: 'Hello, SwiftGo Express. Do you need a dispatch or status check?', timestamp: new Date(Date.now() - 1000 * 3600 * 2).toISOString() },
        { role: 'user', content: 'Can you check where my package ORD-101 is right now?', timestamp: new Date(Date.now() - 1000 * 3600 * 2 + 10000).toISOString() }
      ],
      collected_data: { order_id: 'ORD-101', status: 'Out for Delivery' },
      language_used: 'en',
      created_at: new Date(Date.now() - 1000 * 3600 * 3).toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'call-seed-4',
      business_id: 'biz-seed-1',
      workflow_id: 'wf-seed-1',
      caller_name: 'Dinesh Kumar',
      caller_phone: '+91 97654 32100',
      status: 'new',
      intent: 'Birthday Party Catering Enquiry',
      summary: 'Customer enquired about a 2kg vanilla cake and catering for tomorrow evening.',
      urgency: 'normal',
      follow_up_status: 'pending',
      transcript: [
        { role: 'assistant', content: 'Hello, welcome to Royal Bakery. Are you calling to place a new order?', timestamp: new Date(Date.now() - 1000 * 3600 * 5).toISOString() },
        { role: 'user', content: 'Yes, I need a 2kg cake for tomorrow evening.', timestamp: new Date(Date.now() - 1000 * 3600 * 5 + 15000).toISOString() }
      ],
      collected_data: { weight: '2kg', flavour: 'Vanilla' },
      language_used: 'en',
      created_at: new Date(Date.now() - 1000 * 3600 * 6).toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function load<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}

function save<T>(key: string, data: T[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(data))
}

function ensureSeeded() {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(SEEDED_KEY)) return
  save(BIZ_KEY, makeSeedBusinesses())
  save(WF_KEY, makeSeedWorkflows())
  save(CALLS_KEY, makeSeedCalls())
  localStorage.setItem(SEEDED_KEY, '1')
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

export const localDB = {
  // ── Businesses ──
  getBusinesses(): Business[] {
    ensureSeeded()
    return load<Business>(BIZ_KEY)
  },

  getBusiness(id: string): Business | null {
    return this.getBusinesses().find(b => b.id === id) || null
  },

  saveBusiness(biz: Omit<Business, 'id' | 'created_at' | 'updated_at'>): Business {
    const businesses = this.getBusinesses()
    const newBiz: Business = {
      ...biz,
      id: `biz_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    save(BIZ_KEY, [...businesses, newBiz])
    return newBiz
  },

  updateBusiness(id: string, updates: Partial<Business>): boolean {
    const businesses = this.getBusinesses()
    const idx = businesses.findIndex(b => b.id === id)
    if (idx === -1) return false
    businesses[idx] = { ...businesses[idx], ...updates, updated_at: new Date().toISOString() }
    save(BIZ_KEY, businesses)
    return true
  },

  deleteBusiness(id: string) {
    save(BIZ_KEY, this.getBusinesses().filter(b => b.id !== id))
    // Also clean up workflows and calls for this business
    save(WF_KEY, this.getWorkflows().filter(w => w.business_id !== id))
    save(CALLS_KEY, this.getCalls().filter(c => c.business_id !== id))
  },

  // ── Workflows ──
  getWorkflows(): Workflow[] {
    ensureSeeded()
    return load<Workflow>(WF_KEY)
  },

  getWorkflow(id: string): Workflow | null {
    return this.getWorkflows().find(w => w.id === id) || null
  },

  saveWorkflow(wf: Omit<Workflow, 'id' | 'created_at' | 'updated_at'>): Workflow {
    const workflows = this.getWorkflows()
    const newWf: Workflow = {
      ...wf,
      id: `wf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    save(WF_KEY, [...workflows, newWf])
    return newWf
  },

  updateWorkflow(id: string, updates: Partial<Workflow>): boolean {
    const workflows = this.getWorkflows()
    const idx = workflows.findIndex(w => w.id === id)
    if (idx === -1) return false
    workflows[idx] = { ...workflows[idx], ...updates, updated_at: new Date().toISOString() }
    save(WF_KEY, workflows)
    return true
  },

  deleteWorkflow(id: string) {
    save(WF_KEY, this.getWorkflows().filter(w => w.id !== id))
  },

  // ── Calls ──
  getCalls(): Call[] {
    ensureSeeded()
    return load<Call>(CALLS_KEY).sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  },

  getCall(id: string): Call | null {
    return this.getCalls().find(c => c.id === id) || null
  },

  saveCall(call: Omit<Call, 'id' | 'created_at' | 'updated_at'>): Call {
    const calls = this.getCalls()
    const newCall: Call = {
      ...call,
      id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    save(CALLS_KEY, [...calls, newCall])
    return newCall
  },

  updateCall(id: string, updates: Partial<Call>): boolean {
    const calls = load<Call>(CALLS_KEY)
    const idx = calls.findIndex(c => c.id === id)
    if (idx === -1) return false
    calls[idx] = { ...calls[idx], ...updates, updated_at: new Date().toISOString() }
    save(CALLS_KEY, calls)
    return true
  },

  // ── Enriched queries (attach business data) ──
  getCallsWithBusiness(): (Call & { business: Business | null })[] {
    const calls = this.getCalls()
    const businesses = this.getBusinesses()
    const bizMap = Object.fromEntries(businesses.map(b => [b.id, b]))
    return calls.map(c => ({ ...c, business: bizMap[c.business_id] || null }))
  },

  getWorkflowsWithBusiness(): (Workflow & { business: Business | null })[] {
    const workflows = this.getWorkflows()
    const businesses = this.getBusinesses()
    const bizMap = Object.fromEntries(businesses.map(b => [b.id, b]))
    return workflows.map(w => ({ ...w, business: bizMap[w.business_id] || null }))
  },
}
