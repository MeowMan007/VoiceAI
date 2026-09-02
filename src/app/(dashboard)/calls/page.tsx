'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Call, Business, CallStatus } from '@/types'
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
      { role: 'assistant', content: "Hello, thanks for calling Sweet Delights Bakery. How can I assist you with your order today?", timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
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
    summary: 'Caller inquired about tracking status for ORD-101. Delivery API queried: Package is out for delivery with courier.',
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
  const [selectedBusiness, setSelectedBusiness] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedUrgency, setSelectedUrgency] = useState<string>('all')
  const supabase = createClient()

  const fetchCallsAndBusinesses = async () => {
    try {
      const [{ data: callsData }, { data: bizData }] = await Promise.all([
        supabase.from('calls').select('*, business:businesses(name, type)').order('created_at', { ascending: false }),
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
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Call Records</h1>
          <p className="page-subtitle">
            Review captured details, transcripts, Google Calendar bookings, and follow-ups.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <button type="button" onClick={exportCSV} className="btn-secondary">
            <Download size={14} /> Export CSV
          </button>
          <Link href="/simulator" className="btn-primary">
            <PhoneCall size={14} /> Simulate Call
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className="glass-card"
        style={{
          padding: '16px 20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '24px'
        }}
      >
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-field"
            style={{ paddingLeft: '34px' }}
            placeholder="Search caller name, phone, intent..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div>
          <select
            className="input-field"
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
            className="input-field"
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
            className="input-field"
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

      {/* Call Table Card */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full text-left" style={{ fontSize: '12px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                {['Caller', 'Business & Intent', 'Priority', 'Follow-up Status', 'Date & Time', ''].map((h, i) => (
                  <th key={h} style={{ padding: '14px 24px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', ...(i === 5 ? { textAlign: 'right' } : {}) }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCalls.map(call => {
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
                          {call.caller_name || 'Anonymous Caller'}
                        </p>
                        <p className="font-mono mt-0.5" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {call.caller_phone || 'Direct line'}
                        </p>
                      </Link>
                    </td>

                    <td style={{ padding: '16px 24px' }}>
                      <p className="text-white font-medium">{biz?.name || 'General'}</p>
                      <p className="truncate max-w-[220px] mt-0.5" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {call.intent}
                      </p>
                    </td>

                    <td style={{ padding: '16px 24px' }}>
                      <span className={cn('badge', {
                        'badge-urgent': call.urgency === 'urgent',
                        'badge-new': call.urgency === 'normal',
                        'badge-completed': call.urgency === 'low'
                      })}>
                        {call.urgency === 'urgent' ? 'Urgent' : call.urgency === 'normal' ? 'Normal' : 'Low'}
                      </span>
                    </td>

                    <td style={{ padding: '16px 24px' }}>
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
                        style={{
                          background: 'var(--bg-inset)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          fontSize: '12px',
                          padding: '6px 10px',
                          color: '#ffffff',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="pending">Pending</option>
                        <option value="contacted">Contacted</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>

                    <td style={{ padding: '16px 24px', fontSize: '11px' }}>
                      <p className="text-white font-medium">{formatRelativeTime(call.created_at)}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '2px' }}>{formatDate(call.created_at)}</p>
                    </td>

                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <Link
                        href={`/calls/${call.id}`}
                        className="btn-secondary"
                        style={{ fontSize: '11px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        Details <ChevronRight size={12} />
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
