/**
 * Local DB — zero-dependency data store.
 * Backed by localStorage on the client and in-memory seed cache on the server.
 * Full CRUD for businesses, workflows, and calls matching src/types/index.ts.
 */

import { Business, Workflow, Call } from '@/types'
import { SEED_BUSINESSES, SEED_WORKFLOWS, SEED_CALLS } from '@/lib/seed-data'

export type { Business, Workflow, Call }

// Compatibility alias for CallRecord
export type CallRecord = Call & {
  businessId?: string
  workflowId?: string
  callerName?: string
  callerPhone?: string
  duration?: number
  toolsUsed?: string[]
  tools_used?: string[]
  userId?: string
  createdAt?: string
}

const KEYS = {
  businesses: 'voiceai_businesses_v2',
  workflows: 'voiceai_workflows_v2',
  calls: 'voiceai_calls_v2',
  seeded: 'voiceai_seeded_v2',
}

// In-memory server fallback store
const memoryStore = {
  businesses: [...SEED_BUSINESSES],
  workflows: [...SEED_WORKFLOWS],
  calls: [...SEED_CALLS],
}

function read<T>(key: keyof typeof memoryStore, storageKey: string): T[] {
  if (typeof window === 'undefined') {
    return memoryStore[key] as unknown as T[]
  }
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return memoryStore[key] as unknown as T[]
    return JSON.parse(raw)
  } catch {
    return memoryStore[key] as unknown as T[]
  }
}

function write<T>(key: keyof typeof memoryStore, storageKey: string, data: T[]) {
  (memoryStore[key] as unknown as T[]) = data
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data))
    } catch {
      /* ignore */
    }
  }
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

/** Seed demo data once per browser or initialize store */
export function seedIfNeeded(_userId?: string) {
  if (typeof window === 'undefined') return
  try {
    const alreadySeeded = localStorage.getItem(KEYS.seeded)
    if (!alreadySeeded) {
      write('businesses', KEYS.businesses, SEED_BUSINESSES)
      write('workflows', KEYS.workflows, SEED_WORKFLOWS)
      write('calls', KEYS.calls, SEED_CALLS)
      localStorage.setItem(KEYS.seeded, '2')
    }
  } catch {
    /* ignore */
  }
}

export const localDB = {
  businesses: {
    list(_userId?: string): Business[] {
      seedIfNeeded(_userId)
      return read<Business>('businesses', KEYS.businesses)
    },
    get(id: string): Business | null {
      seedIfNeeded()
      const all = read<Business>('businesses', KEYS.businesses)
      return all.find(b => b.id === id) ?? null
    },
    create(data: Partial<Business> & { name: string; type: any }): Business {
      seedIfNeeded()
      const all = read<Business>('businesses', KEYS.businesses)
      const now = new Date().toISOString()
      const { name, type, ...rest } = data
      const item: Business = {
        id: 'biz_' + uid(),
        owner_id: data.owner_id || 'demo-user-1',
        phone: data.phone || '',
        description: data.description || '',
        language: data.language || 'en',
        created_at: now,
        updated_at: now,
        ...rest,
        name,
        type: type || 'other',
      }
      write('businesses', KEYS.businesses, [item, ...all])
      return item
    },
    update(id: string, data: Partial<Business>): Business | null {
      seedIfNeeded()
      const all = read<Business>('businesses', KEYS.businesses)
      const idx = all.findIndex(b => b.id === id)
      if (idx === -1) return null
      all[idx] = { ...all[idx], ...data, updated_at: new Date().toISOString() }
      write('businesses', KEYS.businesses, all)
      return all[idx]
    },
    delete(id: string) {
      seedIfNeeded()
      const all = read<Business>('businesses', KEYS.businesses)
      write('businesses', KEYS.businesses, all.filter(b => b.id !== id))
    },
  },

  workflows: {
    list(_userId?: string): Workflow[] {
      seedIfNeeded(_userId)
      const wfs = read<Workflow>('workflows', KEYS.workflows)
      const bizs = read<Business>('businesses', KEYS.businesses)
      const bmap: Record<string, Business> = {}
      bizs.forEach(b => { bmap[b.id] = b })
      return wfs.map(w => ({
        ...w,
        business: bmap[w.business_id] || (w as any).business,
        // compatibility aliases
        businessId: w.business_id,
        isActive: w.is_active,
      }))
    },
    listByBusiness(businessId: string): Workflow[] {
      return localDB.workflows.list().filter(w => w.business_id === businessId || (w as any).businessId === businessId)
    },
    get(id: string): Workflow | null {
      const all = localDB.workflows.list()
      return all.find(w => w.id === id) ?? null
    },
    create(data: Partial<Workflow> & { name: string; business_id?: string; businessId?: string }): Workflow {
      seedIfNeeded()
      const all = read<Workflow>('workflows', KEYS.workflows)
      const now = new Date().toISOString()
      const bId = data.business_id || data.businessId || 'biz_bakery'
      const { name, ...rest } = data
      const item: Workflow = {
        id: 'wf_' + uid(),
        business_id: bId,
        trigger: data.trigger || 'missed_call',
        greeting: data.greeting || 'Thank you for calling. How can I assist you?',
        closing_message: data.closing_message || 'Thank you! We will get back to you shortly.',
        language: data.language || 'en',
        fields: data.fields || [],
        conditions: data.conditions || [],
        post_action: data.post_action || 'create_record',
        calendar_enabled: !!data.calendar_enabled,
        is_active: data.is_active !== false && (data as any).isActive !== false,
        created_at: now,
        updated_at: now,
        ...rest,
        name,
      }
      write('workflows', KEYS.workflows, [item, ...all])
      return item
    },
    update(id: string, data: Partial<Workflow> & Record<string, any>): Workflow | null {
      seedIfNeeded()
      const all = read<Workflow>('workflows', KEYS.workflows)
      const idx = all.findIndex(w => w.id === id)
      if (idx === -1) return null
      const updated = {
        ...all[idx],
        ...data,
        business_id: data.business_id || data.businessId || all[idx].business_id,
        is_active: data.is_active !== undefined ? data.is_active : data.isActive !== undefined ? data.isActive : all[idx].is_active,
        updated_at: new Date().toISOString(),
      }
      all[idx] = updated
      write('workflows', KEYS.workflows, all)
      return all[idx]
    },
    delete(id: string) {
      seedIfNeeded()
      const all = read<Workflow>('workflows', KEYS.workflows)
      write('workflows', KEYS.workflows, all.filter(w => w.id !== id))
    },
  },

  calls: {
    list(_userId?: string): CallRecord[] {
      seedIfNeeded(_userId)
      const rawCalls = read<Call>('calls', KEYS.calls)
      const bizs = read<Business>('businesses', KEYS.businesses)
      const bmap: Record<string, Business> = {}
      bizs.forEach(b => { bmap[b.id] = b })

      return rawCalls
        .map(c => ({
          ...c,
          business: bmap[c.business_id],
          // Compatibility aliases
          businessId: c.business_id,
          workflowId: c.workflow_id,
          callerName: c.caller_name,
          callerPhone: c.caller_phone,
          duration: c.duration_seconds,
          createdAt: c.created_at,
          toolsUsed: (c as any).tools_used || (c as any).toolsUsed || [],
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    },
    get(id: string): CallRecord | null {
      const all = localDB.calls.list()
      return all.find(c => c.id === id) ?? null
    },
    create(data: Partial<Call> & Record<string, any>): CallRecord {
      seedIfNeeded()
      const all = read<Call>('calls', KEYS.calls)
      const now = new Date().toISOString()
      const item: Call = {
        id: 'call_' + uid(),
        business_id: data.business_id || data.businessId || 'biz_bakery',
        workflow_id: data.workflow_id || data.workflowId || 'wf_cake_intake',
        caller_name: data.caller_name || data.callerName || 'Anonymous',
        caller_phone: data.caller_phone || data.callerPhone || '+91 98000 00000',
        status: data.status || 'completed',
        intent: data.intent || 'General Enquiry',
        summary: data.summary || 'Customer called regarding business inquiries.',
        urgency: data.urgency || 'normal',
        follow_up_status: data.follow_up_status || data.followUpStatus || 'pending',
        transcript: data.transcript || [],
        collected_data: data.collected_data || data.collectedData || {},
        language_used: data.language_used || data.languageUsed || 'en',
        duration_seconds: data.duration_seconds || data.duration || 60,
        calendar_event_id: data.calendar_event_id || data.calendarEventId,
        calendar_event_url: data.calendar_event_url || data.calendarEventUrl,
        created_at: now,
        updated_at: now,
        ...data,
      }
      write('calls', KEYS.calls, [item, ...all])
      return {
        ...item,
        businessId: item.business_id,
        workflowId: item.workflow_id,
        callerName: item.caller_name,
        callerPhone: item.caller_phone,
        duration: item.duration_seconds,
        createdAt: item.created_at,
      }
    },
    update(id: string, data: Partial<Call> & Record<string, any>): CallRecord | null {
      seedIfNeeded()
      const all = read<Call>('calls', KEYS.calls)
      const idx = all.findIndex(c => c.id === id)
      if (idx === -1) return null
      const updated = {
        ...all[idx],
        ...data,
        updated_at: new Date().toISOString(),
      }
      all[idx] = updated
      write('calls', KEYS.calls, all)
      return {
        ...updated,
        businessId: updated.business_id,
        workflowId: updated.workflow_id,
        callerName: updated.caller_name,
        callerPhone: updated.caller_phone,
        duration: updated.duration_seconds,
        createdAt: updated.created_at,
      }
    },
    delete(id: string) {
      seedIfNeeded()
      const all = read<Call>('calls', KEYS.calls)
      write('calls', KEYS.calls, all.filter(c => c.id !== id))
    },
    stats(_userId?: string) {
      const calls = localDB.calls.list(_userId)
      const now = new Date()
      return {
        total: calls.length,
        completed: calls.filter(c => c.status === 'completed').length,
        missed: calls.filter(c => c.status === 'missed').length,
        urgent: calls.filter(c => c.urgency === 'urgent').length,
        pending: calls.filter(c => c.follow_up_status === 'pending' || (c as any).followUpStatus === 'pending').length,
        today: calls.filter(c => {
          const d = new Date(c.created_at)
          return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        }).length,
      }
    },
  },
}
