'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Call, BUSINESS_TYPES, CallStatus } from '@/types'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Phone, Calendar, Clock, User, CheckCircle2,
  AlertTriangle, MessageSquare, ExternalLink, Sparkles,
  Check, X
} from 'lucide-react'
import { formatDate, formatRelativeTime, cn } from '@/lib/utils'

export default function CallDetailPage() {
  const params = useParams()
  const router = useRouter()
  const callId = params?.id as string
  const [call, setCall] = useState<Call | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const supabase = createClient()

  const fetchCall = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('calls')
      .select('*, business:businesses(name, type, phone), workflow:workflows(name, trigger, post_action, calendar_enabled)')
      .eq('id', callId)
      .single()

    if (error || !data) {
      toast.error('Call record not found')
      router.push('/calls')
    } else {
      setCall(data as Call)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (callId) fetchCall()
  }, [callId])

  const handleStatusChange = async (status: CallStatus, followUp: Call['follow_up_status']) => {
    setUpdating(true)
    const { error } = await supabase
      .from('calls')
      .update({ status, follow_up_status: followUp })
      .eq('id', callId)

    if (error) {
      toast.error('Failed to update status')
    } else {
      toast.success(`Marked as ${followUp}`)
      setCall(prev => prev ? { ...prev, status, follow_up_status: followUp } : null)
    }
    setUpdating(false)
  }

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading call details...</p>
      </div>
    )
  }

  if (!call) return null

  const biz = call.business as { name: string; type: string; phone?: string } | null
  const typeInfo = biz?.type ? BUSINESS_TYPES[biz.type as keyof typeof BUSINESS_TYPES] : null
  const wf = call.workflow as { name: string; trigger: string; post_action: string; calendar_enabled: boolean } | null

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/calls" className="p-2 rounded-lg btn-secondary">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-display">
                {call.caller_name || 'Caller Details'}
              </h1>
              <span className={cn('badge', {
                'badge-urgent': call.urgency === 'urgent',
                'badge-new': call.urgency === 'normal',
                'badge-completed': call.urgency === 'low'
              })}>
                {call.urgency === 'urgent' ? '🔴 Urgent' : call.urgency === 'normal' ? '⚪ Normal' : '🟢 Low'}
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Call ID: <span className="font-mono text-[11px]">{call.id}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleStatusChange('in_progress', 'contacted')}
            disabled={updating || call.follow_up_status === 'contacted'}
            className={cn('btn-secondary text-xs flex items-center gap-1.5 py-2 px-3',
              call.follow_up_status === 'contacted' && 'bg-purple-500/20 text-purple-300 border-purple-500/40')}
          >
            <Check size={14} /> Mark Contacted
          </button>
          <button
            onClick={() => handleStatusChange('completed', 'resolved')}
            disabled={updating || call.follow_up_status === 'resolved'}
            className={cn('btn-secondary text-xs flex items-center gap-1.5 py-2 px-3',
              call.follow_up_status === 'resolved' && 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40')}
          >
            <CheckCircle2 size={14} /> Mark Resolved
          </button>
          <button
            onClick={() => handleStatusChange('closed', 'closed')}
            disabled={updating || call.follow_up_status === 'closed'}
            className={cn('btn-secondary text-xs flex items-center gap-1.5 py-2 px-3',
              call.follow_up_status === 'closed' && 'bg-slate-500/20 text-slate-300 border-slate-500/40')}
          >
            <X size={14} /> Close
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Metadata & AI Summary */}
        <div className="space-y-6 lg:col-span-1">
          {/* Quick Info Card */}
          <div className="glass-card p-5 space-y-3">
            <h3 className="text-xs font-semibold tracking-wider text-purple-400 uppercase mb-3">Call Overview</h3>
            
            <div>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>CALLER PHONE</p>
              <p className="text-sm font-medium">{call.caller_phone || 'Not recorded'}</p>
            </div>

            <div>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>BUSINESS</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span>{typeInfo?.icon || '🏢'}</span>
                <span className="text-sm font-medium">{biz?.name || 'Unknown'}</span>
              </div>
            </div>

            <div>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>WORKFLOW USED</p>
              <p className="text-sm font-medium">{wf?.name || 'Direct Simulator'}</p>
            </div>

            <div>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>INTENT DETECTED</p>
              <p className="text-sm font-semibold text-purple-300">{call.intent || 'General Enquiry'}</p>
            </div>

            <div>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>RECEIVED AT</p>
              <p className="text-xs font-medium">{formatDate(call.created_at)}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{formatRelativeTime(call.created_at)}</p>
            </div>

            <div>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>LANGUAGE</p>
              <p className="text-xs font-medium uppercase">{call.language_used === 'hi' ? '🇮🇳 Hindi' : '🇬🇧 English'}</p>
            </div>
          </div>

          {/* AI Summary Card */}
          <div className="glass-card p-5" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(59,130,246,0.08))' }}>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-purple-400" />
              <h3 className="text-xs font-semibold tracking-wider text-purple-300 uppercase">AI Summary</h3>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {call.summary || 'Summary unavailable.'}
            </p>
          </div>

          {/* Action Performed / Calendar */}
          {(call.calendar_event_id || wf?.calendar_enabled) && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={16} className="text-blue-400" />
                <h3 className="text-xs font-semibold tracking-wider text-blue-300 uppercase">External Tool Action</h3>
              </div>
              {call.calendar_event_id ? (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 text-blue-300 font-medium">
                    <CheckCircle2 size={14} /> Google Calendar Event Created
                  </div>
                  <p className="font-mono text-[11px] text-zinc-400 truncate">ID: {call.calendar_event_id}</p>
                  {call.calendar_event_url && (
                    <a
                      href={call.calendar_event_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-purple-400 hover:underline pt-1"
                    >
                      Open in Calendar <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-xs text-zinc-400">
                  Calendar tool was available during conversation; no appointment slot was confirmed.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Collected Information & Transcript */}
        <div className="space-y-6 lg:col-span-2">
          {/* Collected Information Grid */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span>📋</span> Captured Customer Information
            </h3>
            {Object.keys(call.collected_data || {}).length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No structured fields extracted from this conversation.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(call.collected_data || {}).map(([key, val]) => (
                  <div key={key} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <p className="text-[11px] font-medium tracking-wide uppercase text-zinc-400">
                      {key.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm font-semibold mt-0.5 text-white">
                      {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Conversation Transcript */}
          <div className="glass-card p-5 flex flex-col">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <MessageSquare size={16} className="text-purple-400" /> Full Conversation Transcript
            </h3>

            {(!call.transcript || (call.transcript as unknown[]).length === 0) ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No transcript recorded.</p>
            ) : (
              <div className="space-y-3.5 max-h-[550px] overflow-y-auto pr-2">
                {(call.transcript as Array<{ role: 'assistant' | 'user'; content: string; timestamp?: string }>).map((msg, i) => (
                  <div
                    key={i}
                    className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : '')}
                  >
                    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold',
                      msg.role === 'user' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400')}>
                      {msg.role === 'user' ? '👤' : '🤖'}
                    </div>
                    <div
                      className={cn('max-w-[85%] px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed',
                        msg.role === 'user'
                          ? 'rounded-tr-sm text-white bg-gradient-to-r from-purple-600 to-indigo-600'
                          : 'rounded-tl-sm bg-white/[0.04] border border-white/[0.08] text-zinc-200')}
                    >
                      <p className="text-[10px] font-semibold tracking-wider opacity-60 mb-1 uppercase">
                        {msg.role === 'user' ? 'Customer' : 'Voice Assistant'}
                      </p>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
