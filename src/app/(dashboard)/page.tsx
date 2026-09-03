'use client'
import { useEffect, useState } from 'react'
import { localDB } from '@/lib/local-db'
import { Call, DashboardStats } from '@/types'
import { formatRelativeTime, cn } from '@/lib/utils'
import Link from 'next/link'
import {
  PhoneCall, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, ArrowRight, Building2, GitBranch, Mic
} from 'lucide-react'

const SEED_CALLS: Call[] = [
  {
    id: 'call-seed-1', business_id: 'biz-1', workflow_id: 'wf-1',
    caller_name: 'Rahul Sharma', caller_phone: '+91 98765 43210',
    status: 'in_progress', intent: 'Order Custom Chocolate Truffle Cake',
    summary: 'Customer called to order a 1kg chocolate truffle cake for a birthday tomorrow. Delivery requested by 4:00 PM.',
    urgency: 'urgent', follow_up_status: 'pending',
    transcript: [
      { role: 'assistant', content: 'Hello, thanks for calling Sweet Delights Bakery. How can I assist you?', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
      { role: 'user', content: 'I need a 1kg chocolate truffle cake urgently for tomorrow afternoon.', timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString() }
    ],
    collected_data: { flavour: 'Chocolate Truffle', weight: '1kg', required_date: 'Tomorrow' },
    language_used: 'en',
    created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    updated_at: new Date().toISOString(),
    business: { id: 'biz-1', owner_id: 'demo', name: 'Sweet Delights Bakery', type: 'cake_shop', language: 'en', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  },
  {
    id: 'call-seed-2', business_id: 'biz-2', workflow_id: 'wf-2',
    caller_name: 'Anita Verma', caller_phone: '+91 98111 22334',
    status: 'completed', intent: 'Doctor Appointment Consultation',
    summary: 'Patient requested appointment for tomorrow at 4 PM. Calendar slot confirmed and follow-up scheduled.',
    urgency: 'normal', follow_up_status: 'resolved',
    calendar_event_id: 'cal_event_98231', calendar_event_url: 'https://calendar.google.com',
    transcript: [
      { role: 'assistant', content: 'Hello, you have reached Apex Family Clinic. How can I help you today?', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
      { role: 'user', content: 'I would like to book an appointment with Dr. Sharma tomorrow at 4 PM please.', timestamp: new Date(Date.now() - 1000 * 60 * 44).toISOString() }
    ],
    collected_data: { patient_name: 'Anita Verma', doctor_preference: 'Dr. Sharma', preferred_time: '16:00' },
    language_used: 'en',
    created_at: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    updated_at: new Date().toISOString(),
    business: { id: 'biz-2', owner_id: 'demo', name: 'Apex Family Clinic', type: 'clinic', language: 'en', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  },
  {
    id: 'call-seed-3', business_id: 'biz-3', workflow_id: 'wf-3',
    caller_name: 'Vikram Singh', caller_phone: '+91 99887 76655',
    status: 'completed', intent: 'Package Status Tracking (ORD-101)',
    summary: 'Package ORD-101 status queried. API confirmed: Out for delivery with courier.',
    urgency: 'normal', follow_up_status: 'contacted',
    transcript: [
      { role: 'assistant', content: 'Hello, SwiftGo Express. Do you need a dispatch or status check?', timestamp: new Date(Date.now() - 1000 * 3600 * 2).toISOString() },
      { role: 'user', content: 'Can you check where my package ORD-101 is right now?', timestamp: new Date(Date.now() - 1000 * 3600 * 2 + 10000).toISOString() }
    ],
    collected_data: { order_id: 'ORD-101', status: 'Out for Delivery' },
    language_used: 'en',
    created_at: new Date(Date.now() - 1000 * 3600 * 3).toISOString(),
    updated_at: new Date().toISOString(),
    business: { id: 'biz-3', owner_id: 'demo', name: 'SwiftGo Express Logistics', type: 'delivery', language: 'en', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  },
  {
    id: 'call-seed-4', business_id: 'biz-4', workflow_id: 'wf-4',
    caller_name: 'Dinesh Kumar', caller_phone: '+91 97654 32100',
    status: 'new', intent: 'Birthday Party Catering Enquiry',
    summary: 'Customer enquired about a 2kg vanilla cake and catering for tomorrow evening.',
    urgency: 'normal', follow_up_status: 'pending',
    transcript: [
      { role: 'assistant', content: 'Hello, welcome to Royal Bakery. Are you calling to place a new order?', timestamp: new Date(Date.now() - 1000 * 3600 * 5).toISOString() },
      { role: 'user', content: 'Yes, I need a 2kg cake for tomorrow evening.', timestamp: new Date(Date.now() - 1000 * 3600 * 5 + 15000).toISOString() }
    ],
    collected_data: { weight: '2kg', flavour: 'Vanilla' },
    language_used: 'en',
    created_at: new Date(Date.now() - 1000 * 3600 * 6).toISOString(),
    updated_at: new Date().toISOString(),
    business: { id: 'biz-4', owner_id: 'demo', name: 'Royal Bakery', type: 'cake_shop', language: 'en', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  }
]

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    total_calls: 14, pending_calls: 3, urgent_calls: 2, completed_calls: 9, today_calls: 6
  })
  const [recentCalls, setRecentCalls] = useState<Call[]>(SEED_CALLS)
  const [businessCount, setBusinessCount] = useState(4)
  const [workflowCount, setWorkflowCount] = useState(4)

  useEffect(() => {
    try {
      const calls = localDB.getCalls()
      const businesses = localDB.getBusinesses()
      const workflows = localDB.getWorkflows()
      const today = new Date().toISOString().split('T')[0]

      if (calls.length > 0) {
        setStats({
          total_calls: calls.length,
          pending_calls: calls.filter(c => c.follow_up_status === 'pending').length,
          urgent_calls: calls.filter(c => c.urgency === 'urgent').length,
          completed_calls: calls.filter(c => c.status === 'completed' || c.follow_up_status === 'resolved').length,
          today_calls: calls.filter(c => c.created_at.startsWith(today)).length
        })
        setRecentCalls(calls.slice(0, 10))
      }
      if (businesses.length > 0) setBusinessCount(businesses.length)
      if (workflows.length > 0) setWorkflowCount(workflows.length)
    } catch (err) {
      console.warn('Using demo data fallback:', err)
    }
  }, [])

  const statCards = [
    { label: 'Total Calls', value: stats.total_calls, icon: PhoneCall, accent: '#ffffff', sub: 'All missed calls handled' },
    { label: 'Pending Follow-Up', value: stats.pending_calls, icon: Clock, accent: '#fbbf24', sub: 'Awaiting callback' },
    { label: 'Urgent Priority', value: stats.urgent_calls, icon: AlertTriangle, accent: '#f87171', sub: 'Within 24 hours' },
    { label: 'Resolved', value: stats.completed_calls, icon: CheckCircle2, accent: '#10b981', sub: 'Completed & booked' },
  ]

  return (
    <div className="page-container">
      {/* Header */}
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

      {/* Stat Cards Grid */}
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

      {/* Summary Hub Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {[
          { href: '/businesses', icon: Building2, label: `${businessCount} Active Businesses`, sub: 'Bakeries, Clinics, Logistics & Services' },
          { href: '/workflows', icon: GitBranch, label: `${workflowCount} Configured Workflows`, sub: 'Missed-call triggers & field logic' },
          { href: '/calls', icon: TrendingUp, label: `${stats.today_calls} Calls Handled Today`, sub: 'Automated resolution rate 92%' },
        ].map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="glass-card flex items-center gap-4 group"
            style={{ padding: '18px 20px', textDecoration: 'none' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'var(--bg-inset)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--green)',
              }}
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

      {/* Recent Calls Table Card */}
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

        <div style={{ overflowX: 'auto' }}>
          <table className="w-full text-left" style={{ fontSize: '12px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                {['Caller', 'Business & Intent', 'Priority', 'Status', 'Received', ''].map(h => (
                  <th key={h} style={{ padding: '12px 24px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', ...(h === '' ? { textAlign: 'right' } : {}) }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentCalls.map(call => {
                const biz = call.business as { name: string; type: string } | null
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
                          {call.caller_name || 'Anonymous'}
                        </p>
                        <p className="font-mono mt-0.5" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {call.caller_phone || 'Direct line'}
                        </p>
                      </Link>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <p className="font-medium text-white">{biz?.name || 'General'}</p>
                      <p className="truncate max-w-[220px] mt-0.5" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {call.intent}
                      </p>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span className={cn('badge', {
                        'badge-urgent': call.urgency === 'urgent',
                        'badge-new': call.urgency === 'normal',
                        'badge-completed': call.urgency === 'low',
                      })}>
                        {call.urgency === 'urgent' ? 'Urgent' : call.urgency === 'normal' ? 'Normal' : 'Low'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span className={cn('badge', {
                        'badge-pending': call.follow_up_status === 'pending',
                        'badge-contacted': call.follow_up_status === 'contacted',
                        'badge-completed': call.follow_up_status === 'resolved',
                        'badge-closed': call.follow_up_status === 'closed',
                      })}>
                        {call.follow_up_status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '11px' }}>
                      {formatRelativeTime(call.created_at)}
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
      </div>
    </div>
  )
}
