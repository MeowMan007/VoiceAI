'use client'
import { useEffect, useState } from 'react'
import { localDB } from '@/lib/local-db'
import { Workflow, Business, BUSINESS_TYPES, WORKFLOW_TEMPLATES } from '@/types'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Plus, GitBranch, Pencil, Trash2, Power, Calendar, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<(Workflow & { business: Business | null })[]>([])

  const fetchWorkflows = () => {
    setWorkflows(localDB.getWorkflowsWithBusiness())
  }

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete workflow "${name}"?`)) return
    localDB.deleteWorkflow(id)
    setWorkflows(prev => prev.filter(w => w.id !== id))
    toast.success('Workflow deleted')
  }

  const toggleActive = (id: string, current: boolean) => {
    localDB.updateWorkflow(id, { is_active: !current })
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
                    {wf.language === 'hi' ? (
                      <span className="badge badge-pending">Hindi (हिंदी)</span>
                    ) : (
                      <span className="badge badge-new">English</span>
                    )}
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
