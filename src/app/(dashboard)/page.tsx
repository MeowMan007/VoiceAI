'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/demo-auth'
import { localDB, Business, Workflow, CallRecord, seedIfNeeded } from '@/lib/local-db'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
  PhoneCall, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, ArrowRight, Building2, GitBranch, Mic
} from 'lucide-react'

function formatRelativeTime(iso: string): string {
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
  const [stats, setStats] = useState({ total: 0, completed: 0, missed: 0, today: 0 })
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
    setStats(s)
    setBusinessMap(bmap)
  }, [router])

  const statCards = [
    { label: 'Total Calls', value: stats.total, icon: PhoneCall, accent: '#ffffff', sub: 'All calls handled' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle2, accent: '#10b981', sub: 'Successfully resolved' },
    { label: 'Missed', value: stats.missed, icon: AlertTriangle, accent: '#f87171', sub: 'Missed — needs follow-up' },
    { label: "Today's Calls", value: stats.today, icon: Clock, accent: '#fbbf24', sub: 'Activity today' },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="page-title">Dashboard</h1>
            <span className="badge badge-completed">Live</span>
          </div>
          <p className="page-subtitle">
            Real-time status of your AI assistant handling customer calls and follow-ups.
          </p>
        </div>
        <Link href="/simulator" id="open-simulator-btn" className="btn-primary">
          <Mic size={14} />
          Test Voice Simulator
        </Link>
      </div>

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {[
          { href: '/businesses', icon: Building2, label: `${businessCount} Active Businesses`, sub: 'Bakeries, Clinics, Logistics & Services' },
          { href: '/workflows', icon: GitBranch, label: `${workflowCount} Configured Workflows`, sub: 'Missed-call triggers & field logic' },
          { href: '/calls', icon: TrendingUp, label: `${stats.today} Calls Handled Today`, sub: 'Records saved locally in your browser' },
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

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div
          className="flex items-center justify-between"
          style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>Recent Interactions</h2>
            <p style={{ fontSize: '12px', marginTop: '2px', color: 'var(--text-secondary)' }}>
              Call records captured and classified by your voice assistant
            </p>
          </div>
          <Link href="/calls" className="text-xs font-semibold flex items-center gap-1.5 transition-colors" style={{ color: 'var(--green)', textDecoration: 'none' }}>
            View All <ArrowRight size={12} />
          </Link>
        </div>

        {recentCalls.length === 0 ? (
          <p style={{ padding: '32px 24px', fontSize: '13px', color: 'var(--text-muted)' }}>
            No calls yet. Run the Voice Simulator to generate call records.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="w-full text-left" style={{ fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  {['Caller', 'Business', 'Status', 'Duration', 'Received', ''].map(h => (
                    <th key={h} style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', ...(h === '' ? { textAlign: 'right' } : {}) }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentCalls.map(call => {
                  const biz = businessMap[call.businessId]
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
                            {call.callerName || 'Anonymous'}
                          </p>
                          <p className="font-mono mt-0.5" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {call.callerPhone || 'Direct line'}
                          </p>
                        </Link>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <p className="font-medium text-white">{biz?.name || 'General'}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{biz?.type || ''}</p>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span className={cn('badge', {
                          'badge-completed': call.status === 'completed',
                          'badge-urgent': call.status === 'missed',
                          'badge-pending': call.status === 'in-progress',
                        })}>
                          {call.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>
                        {call.duration ? `${call.duration}s` : '—'}
                      </td>
                      <td style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '11px' }}>
                        {formatRelativeTime(call.createdAt)}
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
