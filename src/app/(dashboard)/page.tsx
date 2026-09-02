'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Call, DashboardStats, BUSINESS_TYPES } from '@/types'
import { formatRelativeTime, cn } from '@/lib/utils'
import Link from 'next/link'
import {
  PhoneCall, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, ArrowRight, Building2, GitBranch, Mic
} from 'lucide-react'

// Professional seed calls without emojis or non-English text
const SEED_CALLS: Call[] = [
  {
    id: 'call-seed-1',
    business_id: 'biz-1',
    workflow_id: 'wf-1',
    caller_name: 'Rahul Sharma',
    caller_phone: '+91 98765 43210',
    status: 'in_progress',
    intent: 'Order Custom Chocolate Truffle Cake',
    summary: 'Customer called to order a 1kg chocolate truffle cake for a birthday tomorrow. Delivery requested by 4:00 PM.',
    urgency: 'urgent',
    follow_up_status: 'pending',
    transcript: [
      { role: 'assistant', content: "Hello, thanks for calling Sweet Delights Bakery. Sorry we missed your call. How can I assist you with your order today?", timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
      { role: 'user', content: "Hi, I need to order a 1kg chocolate truffle cake urgently for tomorrow afternoon.", timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString() }
    ],
    collected_data: { flavour: 'Chocolate Truffle', weight: '1kg', required_date: 'Tomorrow' },
    language_used: 'en',
    created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    updated_at: new Date().toISOString(),
    business: {
      id: 'biz-1',
      owner_id: 'demo',
      name: 'Sweet Delights Bakery',
      type: 'cake_shop',
      language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    id: 'call-seed-2',
    business_id: 'biz-2',
    workflow_id: 'wf-2',
    caller_name: 'Anita Verma',
    caller_phone: '+91 98111 22334',
    status: 'completed',
    intent: 'Doctor Appointment Consultation',
    summary: 'Patient requested appointment callback for tomorrow at 4:00 PM. Verified calendar slot and scheduled follow-up.',
    urgency: 'normal',
    follow_up_status: 'resolved',
    calendar_event_id: 'cal_event_98231',
    calendar_event_url: 'https://calendar.google.com',
    transcript: [
      { role: 'assistant', content: "Hello, you have reached Apex Family Clinic. Would you like to book an appointment or check timings?", timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
      { role: 'user', content: "I would like to book an appointment with Dr. Sharma tomorrow around 4 PM please.", timestamp: new Date(Date.now() - 1000 * 60 * 44).toISOString() }
    ],
    collected_data: { patient_name: 'Anita Verma', doctor_preference: 'Dr. Sharma', preferred_time: '16:00' },
    language_used: 'en',
    created_at: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    updated_at: new Date().toISOString(),
    business: {
      id: 'biz-2',
      owner_id: 'demo',
      name: 'Apex Family Clinic',
      type: 'clinic',
      language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    id: 'call-seed-3',
    business_id: 'biz-3',
    workflow_id: 'wf-3',
    caller_name: 'Vikram Singh',
    caller_phone: '+91 99887 76655',
    status: 'completed',
    intent: 'Package Status Tracking (ORD-101)',
    summary: 'Caller inquired about tracking status for ORD-101. External delivery API queried: Package is out for delivery with courier.',
    urgency: 'normal',
    follow_up_status: 'contacted',
    transcript: [
      { role: 'assistant', content: "Hello, SwiftGo Express Logistics assistant here. Do you need a new dispatch or status check?", timestamp: new Date(Date.now() - 1000 * 3600 * 2).toISOString() },
      { role: 'user', content: "Can you check where my package ORD-101 is right now?", timestamp: new Date(Date.now() - 1000 * 3600 * 2 + 10000).toISOString() }
    ],
    collected_data: { order_id: 'ORD-101', status: 'Out for Delivery' },
    language_used: 'en',
    created_at: new Date(Date.now() - 1000 * 3600 * 3).toISOString(),
    updated_at: new Date().toISOString(),
    business: {
      id: 'biz-3',
      owner_id: 'demo',
      name: 'SwiftGo Express Logistics',
      type: 'delivery',
      language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    id: 'call-seed-4',
    business_id: 'biz-4',
    workflow_id: 'wf-4',
    caller_name: 'Dinesh Kumar',
    caller_phone: '+91 97654 32100',
    status: 'new',
    intent: 'Birthday Party Catering Enquiry',
    summary: 'Customer called to enquire about custom 2kg vanilla cake and catering options for tomorrow evening.',
    urgency: 'normal',
    follow_up_status: 'pending',
    transcript: [
      { role: 'assistant', content: "Hello, welcome to Royal Bakery. Are you calling to place a new order or ask a question?", timestamp: new Date(Date.now() - 1000 * 3600 * 5).toISOString() },
      { role: 'user', content: "Yes, I need information on ordering a 2kg cake for tomorrow evening.", timestamp: new Date(Date.now() - 1000 * 3600 * 5 + 15000).toISOString() }
    ],
    collected_data: { weight: '2kg', flavour: 'Vanilla' },
    language_used: 'en',
    created_at: new Date(Date.now() - 1000 * 3600 * 6).toISOString(),
    updated_at: new Date().toISOString(),
    business: {
      id: 'biz-4',
      owner_id: 'demo',
      name: 'Royal Bakery',
      type: 'cake_shop',
      language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }
]

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    total_calls: 14,
    pending_calls: 3,
    urgent_calls: 2,
    completed_calls: 9,
    today_calls: 6
  })
  const [recentCalls, setRecentCalls] = useState<Call[]>(SEED_CALLS)
  const [businessCount, setBusinessCount] = useState(4)
  const [workflowCount, setWorkflowCount] = useState(4)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        const [{ data: businesses }, { data: workflows }, { data: calls }] = await Promise.all([
          user ? supabase.from('businesses').select('id').eq('owner_id', user.id) : supabase.from('businesses').select('id'),
          supabase.from('workflows').select('id, business_id'),
          supabase.from('calls').select('*, business:businesses(name, type)').order('created_at', { ascending: false }).limit(10)
        ])

        if (calls && calls.length > 0) {
          const today = new Date().toISOString().split('T')[0]
          setStats({
            total_calls: calls.length,
            pending_calls: calls.filter(c => c.follow_up_status === 'pending').length,
            urgent_calls: calls.filter(c => c.urgency === 'urgent').length,
            completed_calls: calls.filter(c => c.status === 'completed' || c.follow_up_status === 'resolved').length,
            today_calls: calls.filter(c => c.created_at.startsWith(today)).length
          })
          setRecentCalls(calls)
        }

        if (businesses && businesses.length > 0) {
          setBusinessCount(businesses.length)
        }
        if (workflows && workflows.length > 0) {
          setWorkflowCount(workflows.length)
        }
      } catch (err) {
        console.warn('Using demo data fallback:', err)
      }
    }

    fetchData()
  }, [])

  const statCards = [
    { label: 'Total Calls', value: stats.total_calls, icon: PhoneCall, color: '#ffffff', sub: 'Total missed calls handled' },
    { label: 'Pending Follow-Up', value: stats.pending_calls, icon: Clock, color: '#facc15', sub: 'Awaiting team callback' },
    { label: 'Urgent Priority', value: stats.urgent_calls, icon: AlertTriangle, color: '#f87171', sub: 'High priority & within 24h' },
    { label: 'Resolved / Booked', value: stats.completed_calls, icon: CheckCircle2, color: '#10b981', sub: 'Appointments & completed requests' },
  ]

  return (
    <div className="p-8 lg:p-10 max-w-7xl w-full mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white font-display">Dashboard Overview</h1>
            <span className="badge badge-completed text-[11px] px-2.5 py-0.5 font-medium">
              Live Agent
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1.5">
            Real-time status of your AI assistant handling customer calls and follow-ups.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/simulator"
            id="open-simulator-btn"
            className="btn-primary text-xs py-2.5 px-4 shadow-sm"
          >
            <Mic size={14} />
            Test Voice Simulator
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="glass-card p-6 flex flex-col justify-between hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{card.label}</span>
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <card.icon size={15} style={{ color: card.color }} />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-white tracking-tight font-display">
                {card.value}
              </p>
              <p className="text-xs text-zinc-500 mt-1.5">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Hub Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Link
          href="/businesses"
          className="glass-card p-5 flex items-center gap-4 hover:border-zinc-700 transition-colors group"
        >
          <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 group-hover:border-emerald-500/40 transition-colors shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
              {businessCount} Active Businesses
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">Bakeries, Clinics, Logistics & Services</p>
          </div>
        </Link>

        <Link
          href="/workflows"
          className="glass-card p-5 flex items-center gap-4 hover:border-zinc-700 transition-colors group"
        >
          <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 group-hover:border-emerald-500/40 transition-colors shrink-0">
            <GitBranch size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
              {workflowCount} Configured Workflows
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">Missed-call triggers & custom field logic</p>
          </div>
        </Link>

        <Link
          href="/calls"
          className="glass-card p-5 flex items-center gap-4 hover:border-zinc-700 transition-colors group"
        >
          <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 group-hover:border-emerald-500/40 transition-colors shrink-0">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
              {stats.today_calls} Calls Handled Today
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">Automated resolution rate 92%</p>
          </div>
        </Link>
      </div>

      {/* Recent Call Records Table */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800 bg-zinc-950/40">
          <div>
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Recent Customer Interactions</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Call records captured and classified by your voice assistant</p>
          </div>
          <Link
            href="/calls"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors"
          >
            View All Calls <ArrowRight size={14} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider text-[11px] bg-zinc-950/80">
                <th className="py-3.5 px-6">Caller</th>
                <th className="py-3.5 px-6">Business & Intent</th>
                <th className="py-3.5 px-6">Priority</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Received</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {recentCalls.map(call => {
                const biz = call.business as { name: string; type: string } | null

                return (
                  <tr key={call.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="py-4 px-6">
                      <Link href={`/calls/${call.id}`} className="block group">
                        <p className="font-semibold text-white group-hover:text-emerald-400 transition-colors text-xs">
                          {call.caller_name || 'Anonymous Caller'}
                        </p>
                        <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{call.caller_phone || 'Direct line'}</p>
                      </Link>
                    </td>

                    <td className="py-4 px-6">
                      <div>
                        <p className="text-white font-medium text-xs">{biz?.name || 'General'}</p>
                        <p className="text-[11px] text-zinc-400 truncate max-w-[240px] mt-0.5">{call.intent}</p>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className={cn('badge', {
                        'badge-urgent': call.urgency === 'urgent',
                        'badge-new': call.urgency === 'normal',
                        'badge-completed': call.urgency === 'low'
                      })}>
                        {call.urgency === 'urgent' ? 'Urgent' : call.urgency === 'normal' ? 'Normal' : 'Low'}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <span className={cn('badge uppercase text-[10px] tracking-wider', {
                        'badge-pending': call.follow_up_status === 'pending',
                        'badge-contacted': call.follow_up_status === 'contacted',
                        'badge-completed': call.follow_up_status === 'resolved',
                        'badge-closed': call.follow_up_status === 'closed'
                      })}>
                        {call.follow_up_status}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-zinc-400 text-[11px]">
                      {formatRelativeTime(call.created_at)}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/calls/${call.id}`}
                        className="btn-secondary text-[11px] py-1.5 px-3"
                      >
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
