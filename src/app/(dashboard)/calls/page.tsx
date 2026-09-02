'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Call, Business, BUSINESS_TYPES, CallStatus } from '@/types'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { PhoneCall, Search, Download, ChevronRight } from 'lucide-react'
import { formatDate, formatRelativeTime, cn } from '@/lib/utils'

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

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>(SEED_CALLS)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [search, setSearch] = useState('')
  const [selectedBusiness, setSelectedBusiness] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedUrgency, setSelectedUrgency] = useState('all')
  const supabase = createClient()

  const fetchCallsAndBusinesses = async () => {
    try {
      const [{ data: callsData }, { data: bizData }] = await Promise.all([
        supabase
          .from('calls')
          .select('*, business:businesses(name, type), workflow:workflows(name)')
          .order('created_at', { ascending: false }),
        supabase.from('businesses').select('*')
      ])

      if (callsData && callsData.length > 0) {
        setCalls(callsData as Call[])
      } else {
        setCalls(SEED_CALLS)
      }
      if (bizData && bizData.length > 0) {
        setBusinesses(bizData)
      }
    } catch {
      setCalls(SEED_CALLS)
    }
  }

  useEffect(() => {
    fetchCallsAndBusinesses()
  }, [])

  const updateStatus = async (id: string, newStatus: CallStatus, newFollowUp: Call['follow_up_status']) => {
    try {
      await supabase
        .from('calls')
        .update({ status: newStatus, follow_up_status: newFollowUp })
        .eq('id', id)
    } catch {
      // Demo update
    }
    toast.success(`Updated status to ${newFollowUp}`)
    setCalls(prev => prev.map(c => c.id === id ? { ...c, status: newStatus, follow_up_status: newFollowUp } : c))
  }

  const filteredCalls = useMemo(() => {
    return calls.filter(call => {
      const matchesSearch =
        (call.caller_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (call.caller_phone || '').toLowerCase().includes(search.toLowerCase()) ||
        (call.summary || '').toLowerCase().includes(search.toLowerCase()) ||
        (call.intent || '').toLowerCase().includes(search.toLowerCase())

      const matchesBusiness = selectedBusiness === 'all' || call.business_id === selectedBusiness
      const matchesStatus = selectedStatus === 'all' || call.follow_up_status === selectedStatus
      const matchesUrgency = selectedUrgency === 'all' || call.urgency === selectedUrgency

      return matchesSearch && matchesBusiness && matchesStatus && matchesUrgency
    })
  }, [calls, search, selectedBusiness, selectedStatus, selectedUrgency])

  const exportCSV = () => {
    const headers = ['Caller Name', 'Phone', 'Business', 'Intent', 'Urgency', 'Follow-up Status', 'Date', 'Summary']
    const rows = filteredCalls.map(c => [
      `"${c.caller_name || 'Anonymous'}"`,
      `"${c.caller_phone || 'N/A'}"`,
      `"${(c.business as { name?: string })?.name || 'General'}"`,
      `"${c.intent || 'Enquiry'}"`,
      `"${c.urgency || 'normal'}"`,
      `"${c.follow_up_status || 'pending'}"`,
      `"${formatDate(c.created_at)}"`,
      `"${(c.summary || '').replace(/"/g, '""')}"`
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `customer_calls_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Downloaded customer calls CSV')
  }

  return (
    <div className="p-8 lg:p-10 max-w-7xl w-full mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-display">Customer Call Records</h1>
          <p className="text-sm text-zinc-400 mt-1.5">
            Review captured customer details, transcripts, Google Calendar bookings, and follow-ups.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={exportCSV}
            className="btn-secondary text-xs py-2.5 px-4"
          >
            <Download size={14} /> Export CSV
          </button>
          <Link
            href="/simulator"
            className="btn-primary text-xs py-2.5 px-4 shadow-sm"
          >
            <PhoneCall size={14} /> Simulate Call
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            className="input-field pl-9 text-xs py-2.5"
            placeholder="Search caller name, phone, intent..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div>
          <select
            className="input-field text-xs py-2.5"
            value={selectedBusiness}
            onChange={e => setSelectedBusiness(e.target.value)}
          >
            <option value="all">All Businesses</option>
            {businesses.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            className="input-field text-xs py-2.5"
            value={selectedUrgency}
            onChange={e => setSelectedUrgency(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent Priority</option>
            <option value="normal">Normal Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>

        <div>
          <select
            className="input-field text-xs py-2.5"
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Follow-up Statuses</option>
            <option value="pending">Pending Callback</option>
            <option value="contacted">Contacted</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Call Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider text-[11px] bg-zinc-950/80">
                <th className="py-4 px-6">Caller</th>
                <th className="py-4 px-6">Business & Intent</th>
                <th className="py-4 px-6">Priority</th>
                <th className="py-4 px-6">Follow-up Status</th>
                <th className="py-4 px-6">Date & Time</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {filteredCalls.map(call => {
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
                      <select
                        value={call.follow_up_status}
                        onChange={e => {
                          const val = e.target.value as Call['follow_up_status']
                          const statusMap: Record<Call['follow_up_status'], CallStatus> = {
                            pending: 'new',
                            contacted: 'in_progress',
                            resolved: 'completed',
                            closed: 'closed'
                          }
                          updateStatus(call.id, statusMap[val], val)
                        }}
                        className="bg-zinc-900 border border-zinc-800 rounded-lg text-xs py-1.5 px-3 text-white outline-none cursor-pointer hover:border-zinc-700"
                      >
                        <option value="pending">Pending</option>
                        <option value="contacted">Contacted</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>

                    <td className="py-4 px-6 text-zinc-400 text-[11px]">
                      <p className="text-white font-medium">{formatRelativeTime(call.created_at)}</p>
                      <p className="text-zinc-500 text-[10px] mt-0.5">{formatDate(call.created_at)}</p>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/calls/${call.id}`}
                        className="btn-secondary text-[11px] py-1.5 px-3 inline-flex items-center gap-1.5"
                      >
                        Details <ChevronRight size={13} />
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
