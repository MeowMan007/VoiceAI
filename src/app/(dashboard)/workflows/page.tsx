'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Workflow, BUSINESS_TYPES } from '@/types'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Plus, GitBranch, Pencil, Trash2, Power } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<(Workflow & { business: { name: string; type: string } })[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchWorkflows = async () => {
    const { data } = await supabase
      .from('workflows')
      .select('*, business:businesses(name, type)')
      .order('created_at', { ascending: false })
    setWorkflows((data as (Workflow & { business: { name: string; type: string } })[]) || [])
    setLoading(false)
  }

  useEffect(() => { fetchWorkflows() }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete workflow "${name}"?`)) return
    const { error } = await supabase.from('workflows').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Workflow deleted'); fetchWorkflows() }
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('workflows').update({ is_active: !current }).eq('id', id)
    toast.success(`Workflow ${!current ? 'activated' : 'deactivated'}`)
    fetchWorkflows()
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-display">Workflows</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Configure how your AI assistant handles missed calls
          </p>
        </div>
        <Link href="/workflows/new" id="create-workflow-btn"
          className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Create Workflow
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading...
        </div>
      ) : workflows.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <GitBranch size={48} className="mx-auto mb-4 opacity-30" />
          <h3 className="font-semibold text-lg mb-2">No workflows yet</h3>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Create a workflow to define how your AI handles missed calls for each business
          </p>
          <Link href="/workflows/new" id="create-first-workflow-btn" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> Create Workflow
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map(wf => {
            const typeInfo = wf.business?.type ? BUSINESS_TYPES[wf.business.type as keyof typeof BUSINESS_TYPES] : null
            return (
              <div key={wf.id} className={cn('glass-card p-5 flex items-center gap-4', !wf.is_active && 'opacity-60')}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ background: 'rgba(255,255,255,0.05)' }}>
                  {typeInfo?.icon || '⚙️'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-sm">{wf.name}</h3>
                    <span className={cn('badge', wf.is_active ? 'badge-completed' : 'badge-closed')}>
                      {wf.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {wf.calendar_enabled && (
                      <span className="badge badge-contacted">📅 Calendar</span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {wf.business?.name} · {(wf.fields as unknown[])?.length || 0} fields · {(wf.conditions as unknown[])?.length || 0} conditions
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {wf.language === 'hi' ? '🇮🇳 Hindi' : '🇬🇧 English'} · Created {formatDate(wf.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleActive(wf.id, wf.is_active)}
                    id={`toggle-wf-${wf.id}`}
                    className="p-2 rounded-lg btn-secondary"
                    title={wf.is_active ? 'Deactivate' : 'Activate'}>
                    <Power size={14} style={{ color: wf.is_active ? 'var(--accent-green)' : 'var(--text-muted)' }} />
                  </button>
                  <Link href={`/simulator?workflow=${wf.id}`} id={`test-wf-${wf.id}`}
                    className="p-2 rounded-lg btn-secondary text-xs font-medium px-3">
                    Test
                  </Link>
                  <Link href={`/workflows/${wf.id}`} id={`edit-wf-${wf.id}`}
                    className="p-2 rounded-lg btn-secondary">
                    <Pencil size={14} />
                  </Link>
                  <button onClick={() => handleDelete(wf.id, wf.name)}
                    id={`delete-wf-${wf.id}`}
                    className="p-2 rounded-lg"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
