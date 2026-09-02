'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Call, DashboardStats, BUSINESS_TYPES } from '@/types'
import { formatRelativeTime, cn } from '@/lib/utils'
import Link from 'next/link'
import {
  PhoneCall, TrendingUp, AlertTriangle, CheckCircle2,
  Clock, ArrowRight, Building2, GitBranch, Mic, Plus, ShieldCheck
} from 'lucide-react'

// Demo calls used if Supabase is empty or running locally
const SEED_CALLS: Call[] = [
  {
    id: 'call-seed-1',
    business_id: 'biz-1',
    workflow_id: 'wf-1',
    caller_name: 'Rahul Sharma',
    caller_phone: '+91 98765 43210',
    status: 'in_progress',
    intent: 'Order a Cake (Chocolate Truffle)',
    summary: 'Customer called to order a 1kg chocolate truffle cake for a birthday tomorrow. Delivery requested by 4:00 PM.',
    urgency: 'urgent',
    follow_up_status: 'pending',
    transcript: [
      { role: 'assistant', content: "Hi! Thanks for calling Sweet Delights Bakery. Sorry we missed your call. I'm your AI assistant. Are you calling to place an order or general enquiry?", timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
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
    intent: 'Doctor Appointment Booking',
    summary: 'Patient requested appointment callback for tomorrow at 4:00 PM. Verified slot and created Google Calendar event.',
    urgency: 'normal',
    follow_up_status: 'resolved',
    calendar_event_id: 'cal_event_98231',
    calendar_event_url: 'https://calendar.google.com',
    transcript: [
      { role: 'assistant', content: "Hello! You've reached Apex Family Clinic. Would you like to book an appointment or check timings?", timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
      { role: 'user', content: "I'd like to book an appointment with Dr. Sharma tomorrow around 4 PM please.", timestamp: new Date(Date.now() - 1000 * 60 * 44).toISOString() }
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
      { role: 'assistant', content: "Hi! SwiftGo Express Logistics assistant here. Do you need a new delivery or status check?", timestamp: new Date(Date.now() - 1000 * 3600 * 2).toISOString() },
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
    caller_name: 'दिनेश कुमार (Dinesh Kumar)',
    caller_phone: '+91 97654 32100',
    status: 'new',
    intent: 'बर्थडे केक पूछताछ (Hindi Enquiry)',
    summary: 'ग्राहक ने कल शाम के लिए 2 किलो वेनिला केक के लिए पूछताछ की। विवरण दर्ज किया गया।',
    urgency: 'normal',
    follow_up_status: 'pending',
    transcript: [
      { role: 'assistant', content: "नमस्ते! रॉयल बेकर्स में आपका स्वागत है। क्या आप नया ऑर्डर देना चाहते हैं?", timestamp: new Date(Date.now() - 1000 * 3600 * 5).toISOString() },
      { role: 'user', content: "हाँ जी, मुझे कल शाम को 2 किलो का केक चाहिए।", timestamp: new Date(Date.now() - 1000 * 3600 * 5 + 15000).toISOString() }
    ],
    collected_data: { weight: '2kg', flavour: 'Vanilla' },
    language_used: 'hi',
    created_at: new Date(Date.now() - 1000 * 3600 * 6).toISOString(),
    updated_at: new Date().toISOString(),
    business: {
      id: 'biz-4',
      owner_id: 'demo',
      name: 'रॉयल बेकर्स (Royal Bakers)',
      type: 'cake_shop',
      language: 'hi',
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
  const [loading, setLoading] = useState(true)
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
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const statCards = [
    { label: 'Total Calls', value: stats.total_calls, icon: PhoneCall, color: '#ffffff', sub: 'Total inbound missed calls handled' },
    { label: 'Pending Follow-Up', value: stats.pending_calls, icon: Clock, color: '#facc15', sub: 'Awaiting customer callback' },
    { label: 'Urgent Priority', value: stats.urgent_calls, icon: AlertTriangle, color: '#f87171', sub: 'Emergency & <24h requests' },
    { label: 'Resolved / Booked', value: stats.completed_calls, icon: CheckCircle2, color: '#10b981', sub: 'Appointments & completed orders' },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-white">Dashboard Overview</h1>
            <span className="badge badge-completed text-[10px]">Live Agent</span>
          </div>
          <p className="text-xs lg:text-sm text-zinc-400 mt-1">
            Real-time status of your AI assistant handling customer calls and follow-ups.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/simulator"
            id="open-simulator-btn"
            className="btn-primary text-xs py-2 px-3.5 shadow-sm"
          >
            <Mic size={14} />
            Test Voice Simulator
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {statCards.map((card) => (
          <div key={card.label} className="glass-card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-400">{card.label}</span>
              <div className="w-7 h-7 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <card.icon size={14} style={{ color: card.color }} />
              </div>
            </div>
            <div>
              <p className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                {card.value}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1 truncate">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Link
          href="/businesses"
          className="glass-card p-4 flex items-center gap-3.5 hover:border-zinc-700 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shrink-0">
            <Building2 size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{businessCount} Active Businesses</p>
            <p className="text-xs text-zinc-400">Bakeries, Clinics, Logistics & Services</p>
          </div>
        </Link>

        <Link
          href="/workflows"
          className="glass-card p-4 flex items-center gap-3.5 hover:border-zinc-700 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shrink-0">
            <GitBranch size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{workflowCount} Configured Workflows</p>
            <p className="text-xs text-zinc-400">Missed-call triggers & field logic</p>
          </div>
        </Link>

        <Link
          href="/calls"
          className="glass-card p-4 flex items-center gap-3.5 hover:border-zinc-700 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shrink-0">
            <TrendingUp size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{stats.today_calls} Calls Handled Today</p>
            <p className="text-xs text-zinc-400">AI automated resolution rate 92%</p>
          </div>
        </Link>
      </div>

      {/* Recent Call Records Table */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">Recent Customer Interactions</h2>
            <span className="text-xs text-zinc-400">({recentCalls.length} records)</span>
          </div>
          <Link
            href="/calls"
            className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
          >
            View All Calls <ArrowRight size={13} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 font-medium uppercase tracking-wider text-[10px] bg-black/40">
                <th className="p-3.5">Caller</th>
                <th className="p-3.5">Business & Intent</th>
                <th className="p-3.5">Priority</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Received</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {recentCalls.map(call => {
                const biz = call.business as { name: string; type: string } | null
                const typeInfo = biz?.type ? BUSINESS_TYPES[biz.type as keyof typeof BUSINESS_TYPES] : null

                return (
                  <tr key={call.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="p-3.5">
                      <Link href={`/calls/${call.id}`} className="block group">
                        <p className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                          {call.caller_name || 'Anonymous Caller'}
                        </p>
                        <p className="text-[11px] text-zinc-400">{call.caller_phone || 'Direct line'}</p>
                      </Link>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{typeInfo?.icon || '🏢'}</span>
                        <div>
                          <p className="text-white font-medium">{biz?.name || 'General'}</p>
                          <p className="text-[11px] text-zinc-400 truncate max-w-[200px]">{call.intent}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className={cn('badge', {
                        'badge-urgent': call.urgency === 'urgent',
                        'badge-new': call.urgency === 'normal',
                        'badge-completed': call.urgency === 'low'
                      })}>
                        {call.urgency === 'urgent' ? '🔴 Urgent' : call.urgency === 'normal' ? '⚪ Normal' : '🟢 Low'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={cn('badge', {
                        'badge-pending': call.follow_up_status === 'pending',
                        'badge-contacted': call.follow_up_status === 'contacted',
                        'badge-completed': call.follow_up_status === 'resolved',
                        'badge-closed': call.follow_up_status === 'closed'
                      })}>
                        {call.follow_up_status}
                      </span>
                    </td>
                    <td className="p-3.5 text-zinc-400 text-[11px]">
                      {formatRelativeTime(call.created_at)}
                    </td>
                    <td className="p-3.5 text-right">
                      <Link
                        href={`/calls/${call.id}`}
                        className="btn-secondary text-[11px] py-1 px-2.5"
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
