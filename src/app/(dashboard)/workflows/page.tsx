'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Workflow, Business, BUSINESS_TYPES, WORKFLOW_TEMPLATES } from '@/types'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Plus, GitBranch, Pencil, Trash2, Power, Calendar, ArrowRight, Play } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'

const SEED_WORKFLOWS: (Workflow & { business: Business })[] = [
  {
    id: 'wf-seed-1',
    business_id: 'biz-seed-1',
    name: 'Cake Order Intake & Urgency Flagging',
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
    updated_at: new Date().toISOString(),
    business: {
      id: 'biz-seed-1',
      owner_id: 'demo',
      name: 'Sweet Delights Bakery',
      type: 'cake_shop',
      language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
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
    updated_at: new Date().toISOString(),
    business: {
      id: 'biz-seed-2',
      owner_id: 'demo',
      name: 'Apex Family Clinic',
      type: 'clinic',
      language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    id: 'wf-seed-3',
    business_id: 'biz-seed-3',
    name: 'Delivery Request & Live Tracking',
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
    updated_at: new Date().toISOString(),
    business: {
      id: 'biz-seed-3',
      owner_id: 'demo',
      name: 'SwiftGo Express Logistics',
      type: 'delivery',
      language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    id: 'wf-seed-4',
    business_id: 'biz-seed-4',
    name: 'रॉयल बेकर्स केक ऑर्डर (Hindi Voice Flow)',
    trigger: 'missed_call',
    greeting: 'नमस्ते! रॉयल बेकरी में कॉल करने के लिए धन्यवाद। क्या आप केक ऑर्डर करना चाहते हैं?',
    closing_message: 'धन्यवाद! हमने आपकी जानकारी नोट कर ली है। हमारी टीम आपसे जल्द संपर्क करेगी।',
    language: 'hi',
    fields: WORKFLOW_TEMPLATES.cake_shop.fields!,
    conditions: WORKFLOW_TEMPLATES.cake_shop.conditions!,
    post_action: 'create_record',
    calendar_enabled: true,
    is_active: true,
    created_at: new Date(Date.now() - 1000 * 3600 * 120).toISOString(),
    updated_at: new Date().toISOString(),
    business: {
      id: 'biz-seed-4',
      owner_id: 'demo',
      name: 'रॉयल बेकर्स (Royal Bakers)',
      type: 'cake_shop',
      language: 'hi',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }
]

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>(SEED_WORKFLOWS)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchWorkflows = async () => {
    try {
      const { data } = await supabase
        .from('workflows')
        .select('*, business:businesses(name, type)')
        .order('created_at', { ascending: false })

      if (data && data.length > 0) {
        setWorkflows(data as unknown as Workflow[])
      } else {
        setWorkflows(SEED_WORKFLOWS)
      }
    } catch {
      setWorkflows(SEED_WORKFLOWS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete workflow "${name}"?`)) return
    try {
      await supabase.from('workflows').delete().eq('id', id)
      setWorkflows(prev => prev.filter(w => w.id !== id))
      toast.success('Workflow deleted')
    } catch {
      setWorkflows(prev => prev.filter(w => w.id !== id))
      toast.success('Workflow removed')
    }
  }

  const toggleActive = async (id: string, current: boolean) => {
    try {
      await supabase.from('workflows').update({ is_active: !current }).eq('id', id)
    } catch {
      // Demo update
    }
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, is_active: !current } : w))
    toast.success(`Workflow ${!current ? 'activated' : 'paused'}`)
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-white">Missed-Call Workflows</h1>
          <p className="text-xs lg:text-sm text-zinc-400 mt-1">
            Configure how your AI voice assistant greets callers, asks questions, checks tools, and handles follow-ups.
          </p>
        </div>
        <Link
          href="/workflows/new"
          id="create-workflow-btn"
          className="btn-primary text-xs py-2 px-3.5"
        >
          <Plus size={14} /> Create New Workflow
        </Link>
      </div>

      {/* Workflows List */}
      <div className="space-y-3">
        {workflows.map(wf => {
          const typeInfo = wf.business?.type ? BUSINESS_TYPES[wf.business.type as keyof typeof BUSINESS_TYPES] : null
          const fieldCount = (wf.fields as unknown[])?.length || 0
          const conditionCount = (wf.conditions as unknown[])?.length || 0

          return (
            <div
              key={wf.id}
              className={cn(
                'glass-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all',
                !wf.is_active && 'opacity-60 bg-zinc-950'
              )}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xl shrink-0 mt-0.5 sm:mt-0">
                  {typeInfo?.icon || '⚙️'}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm text-white">{wf.name}</h3>
                    <span className={cn('badge', wf.is_active ? 'badge-completed' : 'badge-closed')}>
                      {wf.is_active ? 'Active' : 'Paused'}
                    </span>
                    {wf.calendar_enabled && (
                      <span className="badge badge-contacted flex items-center gap-1">
                        <Calendar size={11} /> Google Calendar
                      </span>
                    )}
                    <span className="badge badge-new text-[10px]">
                      {wf.language === 'hi' ? '🇮🇳 Hindi' : '🇬🇧 English'}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed">
                    <span className="text-white font-medium">{wf.business?.name}</span> • Trigger: <span className="text-zinc-300">Missed Call</span> • {fieldCount} data fields • {conditionCount} conditional rules
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <Link
                  href={`/simulator?workflow=${wf.id}`}
                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <Play size={12} fill="currentColor" /> Test Call
                </Link>

                <button
                  onClick={() => toggleActive(wf.id, wf.is_active)}
                  className="p-2 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  title={wf.is_active ? 'Pause Workflow' : 'Activate Workflow'}
                >
                  <Power size={13} className={wf.is_active ? 'text-emerald-400' : 'text-zinc-500'} />
                </button>

                <Link
                  href={`/workflows/${wf.id}`}
                  className="p-2 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  title="Edit Workflow"
                >
                  <Pencil size={13} />
                </Link>

                <button
                  onClick={() => handleDelete(wf.id, wf.name)}
                  className="p-2 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Delete Workflow"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
