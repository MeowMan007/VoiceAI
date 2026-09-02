'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Call, DashboardStats } from '@/types'
import { formatRelativeTime, cn } from '@/lib/utils'
import Link from 'next/link'
import { BUSINESS_TYPES } from '@/types'
import {
  PhoneCall, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, ArrowRight, Building2, GitBranch, Mic, Plus
} from 'lucide-react'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    total_calls: 0, pending_calls: 0, urgent_calls: 0, completed_calls: 0, today_calls: 0
  })
  const [recentCalls, setRecentCalls] = useState<Call[]>([])
  const [businessCount, setBusinessCount] = useState(0)
  const [workflowCount, setWorkflowCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: businesses }, { data: workflows }, { data: calls }] = await Promise.all([
        supabase.from('businesses').select('id').eq('owner_id', user.id),
        supabase.from('workflows').select('id, business_id'),
        supabase.from('calls').select('*, business:businesses(name, type)').order('created_at', { ascending: false }).limit(10)
      ])

      const today = new Date().toISOString().split('T')[0]
      const callsData = calls || []

      setStats({
        total_calls: callsData.length,
        pending_calls: callsData.filter(c => c.follow_up_status === 'pending').length,
        urgent_calls: callsData.filter(c => c.urgency === 'urgent').length,
        completed_calls: callsData.filter(c => c.status === 'completed').length,
        today_calls: callsData.filter(c => c.created_at.startsWith(today)).length
      })
      setRecentCalls(callsData)
      setBusinessCount(businesses?.length || 0)
      setWorkflowCount(workflows?.length || 0)
      setLoading(false)
    }

    fetchData()

    const channel = supabase.channel('calls-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, () => fetchData())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  const statCards = [
    { label: 'Total Calls', value: stats.total_calls, icon: PhoneCall, color: 'var(--accent-purple)', bg: 'rgba(139,92,246,0.1)' },
    { label: 'Pending Follow-Up', value: stats.pending_calls, icon: Clock, color: 'var(--accent-amber)', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Urgent', value: stats.urgent_calls, icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    { label: 'Completed', value: stats.completed_calls, icon: CheckCircle2, color: 'var(--accent-green)', bg: 'rgba(16,185,129,0.1)' },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-display">Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Overview of your AI-handled calls and workflows
          </p>
        </div>
        <Link href="/simulator" id="open-simulator-btn"
          className="btn-primary flex items-center gap-2 text-sm">
          <Mic size={16} />
          Open Simulator
        </Link>
      </div>

      {/* Quick Setup Banner (if no businesses) */}
      {!loading && businessCount === 0 && (
        <div className="mb-6 p-5 rounded-2xl animate-slide-up"
          style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.15))', border: '1px solid rgba(139,92,246,0.3)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-base">Welcome to VoiceAI! 👋</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Start by creating your business profile, then set up a workflow to handle missed calls.
              </p>
            </div>
            <Link href="/businesses/new" id="create-business-quick-btn"
              className="btn-primary flex items-center gap-2 text-sm shrink-0 ml-4">
              <Plus size={16} />
              Create Business
            </Link>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => (
          <div key={card.label} className="glass-card p-5 animate-slide-up">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{card.label}</p>
                <p className="text-3xl font-bold" style={{ color: card.color }}>
                  {loading ? '—' : card.value}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: card.bg }}>
                <card.icon size={18} style={{ color: card.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Businesses', value: businessCount, icon: Building2, href: '/businesses', color: 'var(--accent-cyan)' },
          { label: 'Workflows', value: workflowCount, icon: GitBranch, href: '/workflows', color: 'var(--accent-pink)' },
          { label: "Today's Calls", value: stats.today_calls, icon: TrendingUp, href: '/calls', color: 'var(--accent-green)' },
        ].map(item => (
          <Link key={item.label} href={item.href}
            className="glass-card p-4 flex items-center gap-3 hover:scale-[1.02] transition-transform">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${item.color}20` }}>
              <item.icon size={16} style={{ color: item.color }} />
            </div>
            <div>
              <p className="text-lg font-bold">{loading ? '—' : item.value}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Calls */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-semibold">Recent Call Records</h2>
          <Link href="/calls" id="view-all-calls-btn"
            className="flex items-center gap-1 text-sm font-medium"
            style={{ color: 'var(--accent-purple)' }}>
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading...
          </div>
        ) : recentCalls.length === 0 ? (
          <div className="p-12 text-center">
            <PhoneCall size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium mb-1">No calls yet</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Use the simulator to test your workflow and generate sample records
            </p>
            <Link href="/simulator" id="try-simulator-btn"
              className="btn-primary inline-flex items-center gap-2 mt-4 text-sm">
              <Mic size={14} />
              Try Simulator
            </Link>
          </div>
        ) : (
          <div className="divide-y" style={{ '--tw-divide-color': 'var(--border)' } as React.CSSProperties}>
            {recentCalls.map(call => {
              const biz = call.business as { name: string; type: string } | null
              const businessInfo = biz?.type ? BUSINESS_TYPES[biz.type as keyof typeof BUSINESS_TYPES] : null
              return (
                <Link key={call.id} href={`/calls/${call.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-white/[0.03] transition-colors">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {businessInfo?.icon || '📞'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {call.caller_name || call.caller_phone || 'Unknown Caller'}
                      </p>
                      {call.urgency === 'urgent' && (
                        <span className="badge badge-urgent">Urgent</span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                      {biz?.name} · {call.intent || 'General Enquiry'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={cn('badge', {
                      'badge-new': call.follow_up_status === 'pending',
                      'badge-contacted': call.follow_up_status === 'contacted',
                      'badge-completed': call.follow_up_status === 'resolved',
                      'badge-closed': call.follow_up_status === 'closed',
                    })}>
                      {call.follow_up_status}
                    </span>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {formatRelativeTime(call.created_at)}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
