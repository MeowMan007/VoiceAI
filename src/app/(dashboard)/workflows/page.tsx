'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Workflow, Business, BUSINESS_TYPES, WORKFLOW_TEMPLATES } from '@/types'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Plus, GitBranch, Pencil, Trash2, Power, Calendar, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

const SEED_WORKFLOWS: (Workflow & { business: Business })[] = [
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
    updated_at: new Date().toISOString(),
    business: {
      id: 'biz-seed-4',
      owner_id: 'demo',
      name: 'Prestige Property Realty',
      type: 'real_estate',
      language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }
]

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<(Workflow & { business: Business })[]>(SEED_WORKFLOWS)
  const supabase = createClient()

  const fetchWorkflows = async () => {
    try {
      const { data } = await supabase
        .from('workflows')
        .select('*, business:businesses(name, type)')
        .order('created_at', { ascending: false })

      if (data && data.length > 0) {
        setWorkflows(data as unknown as (Workflow & { business: Business })[])
      } else {
        setWorkflows(SEED_WORKFLOWS)
      }
    } catch {
      setWorkflows(SEED_WORKFLOWS)
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
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Missed-Call Workflows</h1>
          <p className="page-subtitle">
            Configure how your AI voice assistant greets callers, asks questions, checks tools, and handles follow-ups.
          </p>
        </div>
        <Link href="/workflows/new" id="create-workflow-btn" className="btn-primary">
          <Plus size={14} /> Create Workflow
        </Link>
      </div>

      {/* Workflows List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {workflows.map(wf => {
          const fieldCount = (wf.fields as unknown[])?.length || 0
          const conditionCount = (wf.conditions as unknown[])?.length || 0

          return (
            <div
              key={wf.id}
              className="glass-card"
              style={{
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '20px',
                opacity: wf.is_active ? 1 : 0.6
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', minWidth: 0 }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-inset)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--green)',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}
                >
                  <GitBranch size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>{wf.name}</h3>
                    <span className={cn('badge', wf.is_active ? 'badge-completed' : 'badge-closed')}>
                      {wf.is_active ? 'Active' : 'Paused'}
                    </span>
                    {wf.calendar_enabled && (
                      <span className="badge badge-contacted" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={10} /> Google Calendar
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span style={{ color: '#ffffff', fontWeight: 500 }}>{wf.business?.name}</span>
                    &nbsp;&middot;&nbsp;Missed Call Trigger&nbsp;&middot;&nbsp;{fieldCount} collected fields&nbsp;&middot;&nbsp;{conditionCount} conditional rules
                  </p>
                </div>
              </div>

              {/* Action Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <Link
                  href={`/simulator?workflow=${wf.id}`}
                  className="btn-primary"
                  style={{ padding: '7px 12px', fontSize: '12px' }}
                >
                  <Play size={11} fill="currentColor" /> Test Call
                </Link>

                <button
                  onClick={() => toggleActive(wf.id, wf.is_active)}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '8px',
                    background: 'var(--bg-inset)',
                    border: '1px solid var(--border-subtle)',
                    color: wf.is_active ? 'var(--green)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center'
                  }}
                  title={wf.is_active ? 'Pause Workflow' : 'Activate Workflow'}
                >
                  <Power size={13} />
                </button>

                <Link
                  href={`/workflows/${wf.id}`}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '8px',
                    background: 'var(--bg-inset)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center'
                  }}
                  title="Edit Workflow"
                >
                  <Pencil size={13} />
                </Link>

                <button
                  onClick={() => handleDelete(wf.id, wf.name)}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '8px',
                    background: 'var(--bg-inset)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center'
                  }}
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
