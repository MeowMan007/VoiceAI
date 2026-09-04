'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { localDB, CallRecord, Business, Workflow } from '@/lib/local-db'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ArrowLeft, CheckCircle2, MessageSquare, Sparkles,
  Building2, User, Bot, PhoneCall, Calendar, AlertTriangle,
  Clock, Check, X, ShieldAlert, GitBranch, ExternalLink, Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'

function formatDateTime(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function CallDetailPage() {
  const router = useRouter()
  const params = useParams()
  const callId = params?.id as string

  const [call, setCall] = useState<CallRecord | null>(null)
  const [biz, setBiz] = useState<Business | null>(null)
  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const reload = (id: string) => {
    const c = localDB.calls.get(id)
    if (!c) { setNotFound(true); setLoading(false); return }
    setCall(c)
    const bId = c.business_id || (c as any).businessId
    if (bId) {
      setBiz(localDB.businesses.get(bId))
    }
    const wId = c.workflow_id || (c as any).workflowId
    if (wId) {
      setWorkflow(localDB.workflows.get(wId))
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!callId) return
    reload(callId)
  }, [callId])

  const updateFollowUp = (status: 'pending' | 'contacted' | 'resolved' | 'closed') => {
    if (!call) return
    localDB.calls.update(call.id, {
      follow_up_status: status,
      status: status === 'resolved' || status === 'closed' ? 'completed' : call.status,
    } as any)
    reload(call.id)
    toast.success(`Follow-up status updated to "${status}"`)
  }

  const handleDelete = () => {
    if (!call || !confirm('Are you sure you want to delete this call record?')) return
    localDB.calls.delete(call.id)
    toast.success('Call record deleted')
    router.push('/calls')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound || !call) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <PhoneCall size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
        <h2 className="text-lg font-semibold text-white mb-2">Call Not Found</h2>
        <p style={{ color: 'var(--text-secondary)' }}>This call record doesn&apos;t exist or has been deleted.</p>
        <Link href="/calls" className="btn-secondary" style={{ marginTop: '16px', display: 'inline-flex' }}>
          ← Back to Calls
        </Link>
      </div>
    )
  }

  const transcript = Array.isArray(call.transcript)
    ? call.transcript
    : typeof call.transcript === 'string'
    ? JSON.parse(call.transcript || '[]')
    : []

  const collectedData = call.collected_data || (call as any).calledData || {}
  const hasCollectedData = Object.keys(collectedData).length > 0
  const isUrgent = call.urgency === 'urgent'
  const followUp = call.follow_up_status || (call as any).followUpStatus || 'pending'

  return (
    <div className="p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-6">
      {/* Header with Navigation & Quick Actions */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/calls"
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                {call.caller_name || (call as any).callerName || 'Anonymous Caller'}
              </h1>
              <span className={cn('badge', isUrgent ? 'badge-urgent' : 'badge-completed')}>
                {isUrgent ? '⚡ URGENT' : 'Normal Priority'}
              </span>
              <span className="badge badge-new text-[10px]">
                {call.language_used === 'hi' ? 'Hindi (हिंदी)' : 'English'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {call.caller_phone || (call as any).callerPhone || 'Direct line'} &middot; {formatDateTime(call.created_at || (call as any).createdAt)}
            </p>
          </div>
        </div>

        <button
          onClick={handleDelete}
          className="p-2 text-zinc-500 hover:text-red-400 transition-colors rounded-lg bg-zinc-900 border border-zinc-800 text-xs flex items-center gap-1.5"
          title="Delete record"
        >
          <Trash2 size={13} /> Delete Record
        </button>
      </div>

      {/* Follow-up Status Controller Bar (Prompt Requirement G) */}
      <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Follow-Up Status:
          </span>
          <span className={cn('badge text-xs', {
            'badge-urgent': followUp === 'pending',
            'badge-contacted': followUp === 'contacted',
            'badge-completed': followUp === 'resolved',
            'badge-closed': followUp === 'closed',
          })}>
            {followUp.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => updateFollowUp('contacted')}
            disabled={followUp === 'contacted'}
            className={cn('text-xs py-1.5 px-3 rounded-lg border transition-all flex items-center gap-1',
              followUp === 'contacted'
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 cursor-default'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-blue-500 hover:text-white'
            )}
          >
            <Check size={12} /> Mark Contacted
          </button>
          <button
            onClick={() => updateFollowUp('resolved')}
            disabled={followUp === 'resolved'}
            className={cn('text-xs py-1.5 px-3 rounded-lg border transition-all flex items-center gap-1',
              followUp === 'resolved'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 cursor-default'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-emerald-500 hover:text-white'
            )}
          >
            <CheckCircle2 size={12} /> Mark Completed
          </button>
          <button
            onClick={() => updateFollowUp('closed')}
            disabled={followUp === 'closed'}
            className={cn('text-xs py-1.5 px-3 rounded-lg border transition-all flex items-center gap-1',
              followUp === 'closed'
                ? 'bg-zinc-800 text-zinc-400 border-zinc-700 cursor-default'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
            )}
          >
            <X size={12} /> Close
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Metadata & Tools Executed */}
        <div className="space-y-5 lg:col-span-1">
          {/* Business & Workflow */}
          <div className="glass-card p-4 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Building2 size={12} /> Business & Workflow
            </h2>
            <div className="space-y-2">
              <div>
                <p className="font-semibold text-white text-sm">{biz?.name || 'General Business'}</p>
                <p className="text-xs text-zinc-400 capitalize">{biz?.type?.replace('_', ' ') || 'Service'}</p>
              </div>
              <div className="pt-2 border-t border-zinc-800 flex items-center gap-1.5 text-xs text-zinc-300">
                <GitBranch size={13} className="text-emerald-400 shrink-0" />
                <span className="truncate">{workflow?.name || 'Missed-Call Flow'}</span>
              </div>
            </div>
          </div>

          {/* Caller Details & Intent */}
          <div className="glass-card p-4 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <User size={12} /> Call Information
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-800/50">
                <span className="text-zinc-500">Customer Intent</span>
                <span className="text-white font-medium text-right">{call.intent || 'General Inquiry'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/50">
                <span className="text-zinc-500">Call Duration</span>
                <span className="text-white font-mono">{call.duration_seconds || (call as any).duration || 60}s</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/50">
                <span className="text-zinc-500">Call Status</span>
                <span className="text-white capitalize">{call.status}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Priority Level</span>
                <span className={cn('font-semibold', isUrgent ? 'text-red-400' : 'text-emerald-400')}>
                  {isUrgent ? 'High Urgency' : 'Standard'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Performed & Google Calendar Integration */}
          {(call.calendar_event_id || (call as any).calendarEventId || (call.tools_used && call.tools_used.length > 0)) && (
            <div className="glass-card p-4 space-y-3 border-emerald-500/30 bg-emerald-500/5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Calendar size={12} /> External Tool Actions
              </h2>

              {call.calendar_event_id && (
                <div className="p-2.5 rounded-lg bg-zinc-900 border border-emerald-500/30 space-y-1">
                  <div className="text-[11px] font-semibold text-emerald-400 flex items-center justify-between">
                    <span>Google Calendar Event</span>
                    <span className="text-[10px] font-mono text-zinc-500">CONFIRMED</span>
                  </div>
                  <p className="text-[10px] font-mono text-zinc-400 truncate">
                    ID: {call.calendar_event_id}
                  </p>
                  {call.calendar_event_url && (
                    <a
                      href={call.calendar_event_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 pt-1 font-medium"
                    >
                      Open Google Calendar <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              )}

              {/* Tools Executed Badges */}
              {(call.tools_used || (call as any).toolsUsed)?.map((tool: string, i: number) => (
                <div key={i} className="text-xs text-zinc-300 flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  <span className="font-mono text-[11px]">{tool}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: AI Summary, Collected Data, & Full Transcript */}
        <div className="lg:col-span-2 space-y-5">
          {/* AI-Generated Summary */}
          {call.summary && (
            <div className="glass-card p-5 space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles size={13} /> AI Structured Summary
              </h2>
              <p className="text-sm text-zinc-200 leading-relaxed">
                {call.summary}
              </p>
            </div>
          )}

          {/* Structured Information Collected (Prompt Requirement G) */}
          <div className="glass-card p-5 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 size={13} /> Captured Customer Data
            </h2>

            {hasCollectedData ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Object.entries(collectedData).map(([key, val]) => (
                  <div
                    key={key}
                    className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs"
                  >
                    <span className="text-zinc-500 block text-[10px] uppercase tracking-wider font-semibold">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="text-white font-medium break-words">
                      {String(val || '—')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">No custom fields captured for this call.</p>
            )}
          </div>

          {/* Full Interactive Transcript */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <MessageSquare size={13} /> Full Conversation Transcript
              </h2>
              <span className="text-[10px] text-zinc-500">{transcript.length} turns recorded</span>
            </div>

            {transcript.length > 0 ? (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {transcript.map((msg: { role: string; content: string; timestamp?: string }, i: number) => {
                  const isUser = msg.role === 'user'
                  return (
                    <div
                      key={i}
                      className={cn('flex gap-3', isUser ? 'flex-row-reverse' : '')}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: isUser ? 'var(--green)' : 'rgba(139,92,246,0.2)',
                          border: isUser ? 'none' : '1px solid rgba(139,92,246,0.4)',
                          color: isUser ? '#000' : '#a78bfa'
                        }}
                      >
                        {isUser ? <User size={13} /> : <Bot size={13} />}
                      </div>
                      <div
                        className={cn(
                          'max-w-[80%] p-3 rounded-xl text-xs leading-relaxed',
                          isUser
                            ? 'bg-emerald-500 text-black font-medium rounded-tr-xs'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-xs'
                        )}
                      >
                        <div className="text-[9px] uppercase tracking-wider opacity-60 mb-1 font-mono">
                          {isUser ? 'Customer Caller' : 'Voice AI Assistant'}
                        </div>
                        {msg.content}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">No transcript available for this call.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
