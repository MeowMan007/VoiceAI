'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { localDB, CallRecord, Business } from '@/lib/local-db'
import Link from 'next/link'
import {
  ArrowLeft, CheckCircle2, MessageSquare,
  Sparkles, Building2, User, Bot, PhoneCall
} from 'lucide-react'
import { cn } from '@/lib/utils'

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function CallDetailPage() {
  const params = useParams()
  const callId = params?.id as string
  const [call, setCall] = useState<CallRecord | null>(null)
  const [biz, setBiz] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!callId) return
    const c = localDB.calls.get(callId)
    if (!c) { setNotFound(true); setLoading(false); return }
    setCall(c)
    if (c.businessId) {
      setBiz(localDB.businesses.get(c.businessId))
    }
    setLoading(false)
  }, [callId])

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

  const transcript = call.transcript ? JSON.parse(typeof call.transcript === 'string' ? call.transcript : JSON.stringify(call.transcript)) : []

  return (
    <div className="p-6 lg:p-8 max-w-4xl w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-5">
        <Link
          href="/calls"
          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            {call.callerName || 'Anonymous Caller'}
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            {call.callerPhone || 'No phone'} · {formatRelativeTime(call.createdAt)}
          </p>
        </div>
        <div className="ml-auto">
          <span className={cn('badge', {
            'badge-completed': call.status === 'completed',
            'badge-urgent': call.status === 'missed',
            'badge-pending': call.status === 'in-progress',
          })}>
            {call.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Call Info */}
        <div className="space-y-5 lg:col-span-1">
          {/* Business */}
          <div className="glass-card p-4 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Building2 size={12} /> Business
            </h2>
            <div>
              <p className="font-semibold text-white">{biz?.name || 'Unknown Business'}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{biz?.type || ''}</p>
              {biz?.phone && <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-secondary)' }}>{biz.phone}</p>}
            </div>
          </div>

          {/* Caller Details */}
          <div className="glass-card p-4 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <User size={12} /> Caller Details
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Name</span>
                <span className="text-white">{call.callerName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Phone</span>
                <span className="text-white font-mono text-xs">{call.callerPhone || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Duration</span>
                <span className="text-white">{call.duration ? `${call.duration}s` : '—'}</span>
              </div>
            </div>
          </div>

          {/* Tools Used */}
          {call.toolsUsed && call.toolsUsed.length > 0 && (
            <div className="glass-card p-4 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 size={12} /> Tools Used
              </h2>
              <div className="flex flex-wrap gap-2">
                {call.toolsUsed.map((tool, i) => (
                  <span key={i} className="badge badge-contacted">{tool}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Summary + Transcript */}
        <div className="lg:col-span-2 space-y-5">
          {/* Summary */}
          {call.summary && (
            <div className="glass-card p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-3">
                <Sparkles size={12} /> AI Summary
              </h2>
              <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                {call.summary}
              </p>
            </div>
          )}

          {/* Transcript */}
          <div className="glass-card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-4">
              <MessageSquare size={12} /> Call Transcript
            </h2>
            {Array.isArray(transcript) && transcript.length > 0 ? (
              <div className="space-y-3">
                {transcript.map((msg: { role: string; content: string; timestamp?: string }, i: number) => (
                  <div
                    key={i}
                    className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : '')}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: msg.role === 'assistant' ? 'rgba(139,92,246,0.2)' : 'rgba(59,130,246,0.2)',
                        border: `1px solid ${msg.role === 'assistant' ? 'rgba(139,92,246,0.4)' : 'rgba(59,130,246,0.4)'}`,
                      }}
                    >
                      {msg.role === 'assistant' ? <Bot size={14} style={{ color: '#a78bfa' }} /> : <User size={14} style={{ color: '#60a5fa' }} />}
                    </div>
                    <div
                      style={{
                        maxWidth: '75%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        lineHeight: 1.6,
                        background: msg.role === 'assistant' ? 'rgba(139,92,246,0.1)' : 'rgba(59,130,246,0.1)',
                        color: 'var(--text-primary)',
                        border: `1px solid ${msg.role === 'assistant' ? 'rgba(139,92,246,0.2)' : 'rgba(59,130,246,0.2)'}`,
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                No transcript available for this call.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
