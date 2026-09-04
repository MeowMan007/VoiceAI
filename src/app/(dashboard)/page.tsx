'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/demo-auth'
import { localDB, Business, Workflow, CallRecord, seedIfNeeded } from '@/lib/local-db'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
  PhoneCall, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, ArrowRight, Building2, GitBranch, Mic, Calendar, UserCheck
} from 'lucide-react'

function formatRelativeTime(iso?: string): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function DashboardPage() {
  const router = useRouter()
  const [recentCalls, setRecentCalls] = useState<CallRecord[]>([])
  const [businessCount, setBusinessCount] = useState(0)
  const [workflowCount, setWorkflowCount] = useState(0)
  const [stats, setStats] = useState({ total: 0, completed: 0, missed: 0, urgent: 0, pending: 0, today: 0 })
  const [businessMap, setBusinessMap] = useState<Record<string, Business>>({})

  useEffect(() => {
    const user = getUser()
    if (!user) {
      router.push('/login')
      return
    }
    seedIfNeeded(user.id)

    const businesses = localDB.businesses.list(user.id)
    const workflows = localDB.workflows.list(user.id)
    const calls = localDB.calls.list(user.id)
    const s = localDB.calls.stats(user.id)

    const bmap: Record<string, Business> = {}
    businesses.forEach(b => { bmap[b.id] = b })

    setBusinessCount(businesses.length)
    setWorkflowCount(workflows.length)
    setRecentCalls(calls.slice(0, 10))
    setStats(s as any)
    setBusinessMap(bmap)
  }, [router])

  const statCards = [
    { label: 'Total Calls', value: stats.total, icon: PhoneCall, accent: '#ffffff', sub: 'Total calls processed by AI' },
    { label: 'Urgent Priority', value: stats.urgent || 0, icon: AlertTriangle, accent: '#f87171', sub: 'Immediate attention required' },
    { label: 'Pending Follow-Up', value: stats.pending || 0, icon: Clock, accent: '#fbbf24', sub: 'Awaiting business callback' },
    { label: "Today's Calls", value: stats.today, icon: TrendingUp, accent: '#10b981', sub: 'Active today' },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="page-title">Dashboard</h1>
            <span className="badge badge-completed">Live System</span>
          </div>
          <p className="page-subtitle">
            Real-time status of your Voice AI assistant handling customer missed calls, bookings, and follow-ups.
          </p>
        </div>
        <Link href="/simulator" id="open-simulator-btn" className="btn-primary">
          <Mic size={14} />
          Test Voice Simulator
        </Link>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {statCards.map(card => (
          <div
            key={card.label}
            className="glass-card"
            style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}
          >
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                {card.label}
              </span>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}
              >
                <card.icon size={15} style={{ color: card.accent }} />
              </div>
            </div>
            <div>
              <p style={{ fontSize: '28px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {card.value}
              </p>
              <p style={{ fontSize: '12px', marginTop: '6px', color: 'var(--text-muted)' }}>{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Navigation Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {[
          { href: '/businesses', icon: Building2, label: `${businessCount} Active Businesses`, sub: 'Bakeries, Clinics, Logistics, Real Estate & Repair' },
          { href: '/workflows', icon: GitBranch, label: `${workflowCount} Configured Workflows`, sub: 'Missed-call triggers, field captures & rules' },
          { href: '/calls', icon: UserCheck, label: `${recentCalls.length} Customer Call Records`, sub: 'Classified transcripts, intent & follow-up tracking' },
        ].map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="glass-card flex items-center gap-4 group"
            style={{ padding: '18px 20px', textDecoration: 'none' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--green)' }}
            >
              <item.icon size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors truncate">
                {item.label}
              </p>
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>{item.sub}</p>
            </div>
            <ArrowRight size={14} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
          </Link>
        ))}
      </div>

      {/* Recent Interactions Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div
          className="flex items-center justify-between"
          style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>Recent Call Interactions</h2>
            <p style={{ fontSize: '12px', marginTop: '2px', color: 'var(--text-secondary)' }}>
              Latest customer calls handled by Voice AI with captured intent and urgency classification
            </p>
          </div>
          <Link href="/calls" className="text-xs font-semibold flex items-center gap-1.5 transition-colors" style={{ color: 'var(--green)', textDecoration: 'none' }}>
            View All Calls <ArrowRight size={12} />
          </Link>
        </div>

        {recentCalls.length === 0 ? (
          <p style={{ padding: '32px 24px', fontSize: '13px', color: 'var(--text-muted)' }}>
            No calls yet. Run the Voice Simulator to test customer conversations.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="w-full text-left" style={{ fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  {['Caller', 'Business & Intent', 'Priority & Status', 'Duration', 'Received', ''].map(h => (
                    <th key={h} style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', ...(h === '' ? { textAlign: 'right' } : {}) }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentCalls.map(call => {
                  const bizId = call.business_id || call.businessId || ''
                  const biz = businessMap[bizId]
                  const isUrgent = call.urgency === 'urgent'
                  const followUp = call.follow_up_status || (call as any).followUpStatus || 'pending'
                  const callerName = call.caller_name || call.callerName || 'Anonymous Caller'
                  const callerPhone = call.caller_phone || call.callerPhone || 'Direct line'
                  const createdAt = call.created_at || (call as any).createdAt

                  return (
                    <tr
                      key={call.id}
                      style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '16px 24px' }}>
                        <Link href={`/calls/${call.id}`} style={{ textDecoration: 'none' }} className="block group">
                          <p className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                            {callerName}
                          </p>
                          <p className="font-mono mt-0.5" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {callerPhone}
                          </p>
                        </Link>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <p className="font-medium text-white">{biz?.name || 'General Business'}</p>
                        <p className="text-xs mt-0.5 text-emerald-400">
                          {call.intent || 'Customer Inquiry'}
                        </p>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn('badge text-[10px]', {
                            'badge-urgent': followUp === 'pending',
                            'badge-contacted': followUp === 'contacted',
                            'badge-completed': followUp === 'resolved',
                            'badge-closed': followUp === 'closed',
                          })}>
                            {followUp.toUpperCase()}
                          </span>
                          {isUrgent && (
                            <span className="badge badge-urgent text-[10px] flex items-center gap-0.5">
                              <AlertTriangle size={9} /> URGENT
                            </span>
                          )}
                          {call.calendar_event_id && (
                            <span className="badge badge-contacted text-[10px] flex items-center gap-0.5" title="Calendar Event Booked">
                              <Calendar size={9} /> Cal
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                        {call.duration_seconds || (call as any).duration ? `${call.duration_seconds || (call as any).duration}s` : '—'}
                      </td>
                      <td style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '11px' }}>
                        {formatRelativeTime(createdAt)}
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <Link href={`/calls/${call.id}`} className="btn-secondary" style={{ fontSize: '11px', padding: '6px 12px' }}>
                          Inspect
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
