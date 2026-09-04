'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/demo-auth'
import { localDB, Workflow, Business } from '@/lib/local-db'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Plus, GitBranch, Pencil, Trash2, Power, Play, Calendar, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function WorkflowsPage() {
  const router = useRouter()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [businessMap, setBusinessMap] = useState<Record<string, Business>>({})
  const [userId, setUserId] = useState('')

  const reload = (uid: string) => {
    const wfs = localDB.workflows.list(uid)
    const bizs = localDB.businesses.list(uid)
    const bmap: Record<string, Business> = {}
    bizs.forEach(b => { bmap[b.id] = b })
    setWorkflows(wfs)
    setBusinessMap(bmap)
  }

  useEffect(() => {
    const user = getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)
    reload(user.id)
  }, [router])

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete workflow "${name}"?`)) return
    localDB.workflows.delete(id)
    reload(userId)
    toast.success('Workflow deleted')
  }

  const toggleActive = (id: string, current: boolean) => {
    localDB.workflows.update(id, { is_active: !current })
    reload(userId)
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
        {workflows.length === 0 && (
          <div className="glass-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <GitBranch size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No workflows yet.</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
              Create a workflow to configure how your AI handles missed calls.
            </p>
            <Link href="/workflows/new" className="btn-primary" style={{ marginTop: '16px', display: 'inline-flex' }}>
              <Plus size={14} /> Create First Workflow
            </Link>
          </div>
        )}
        {workflows.map(wf => {
          const biz = businessMap[wf.business_id || (wf as any).businessId] || wf.business
          const fieldCount = wf.fields?.length || 0
          const condCount = wf.conditions?.length || 0
          const isAct = wf.is_active !== false && (wf as any).isActive !== false

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
                opacity: isAct ? 1 : 0.65
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', minWidth: 0 }}>
                <div
                  style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)',
                    color: 'var(--green)', flexShrink: 0, marginTop: '2px'
                  }}
                >
                  <GitBranch size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>{wf.name}</h3>
                    <span className={cn('badge', isAct ? 'badge-completed' : 'badge-closed')}>
                      {isAct ? 'Active' : 'Paused'}
                    </span>
                    <span className="badge badge-new text-[10px]">
                      Trigger: Missed Call
                    </span>
                    {wf.language === 'hi' && (
                      <span className="badge badge-pending text-[10px]">Hindi (हिंदी)</span>
                    )}
                    {wf.calendar_enabled && (
                      <span className="badge badge-contacted text-[10px] flex items-center gap-1">
                        <Calendar size={10} /> Google Calendar
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span style={{ color: '#ffffff', fontWeight: 500 }}>{biz?.name || 'General Business'}</span>
                    &nbsp;·&nbsp;{fieldCount} fields to collect
                    &nbsp;·&nbsp;{condCount} priority rule{condCount !== 1 ? 's' : ''}
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
                  <Play size={11} fill="currentColor" /> Test Simulator
                </Link>

                <button
                  onClick={() => toggleActive(wf.id, isAct)}
                  style={{
                    padding: '7px 10px', borderRadius: '8px',
                    background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)',
                    color: isAct ? 'var(--green)' : 'var(--text-muted)',
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center'
                  }}
                  title={isAct ? 'Pause Workflow' : 'Activate Workflow'}
                >
                  <Power size={13} />
                </button>

                <Link
                  href={`/workflows/${wf.id}`}
                  style={{
                    padding: '7px 10px', borderRadius: '8px',
                    background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center'
                  }}
                  title="Edit Workflow"
                >
                  <Pencil size={13} />
                </Link>

                <button
                  onClick={() => handleDelete(wf.id, wf.name)}
                  style={{
                    padding: '7px 10px', borderRadius: '8px',
                    background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center'
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
