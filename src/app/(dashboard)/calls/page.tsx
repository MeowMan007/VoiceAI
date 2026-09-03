'use client'
import { useEffect, useState, useMemo } from 'react'
import { localDB } from '@/lib/local-db'
import { Call, Business, CallStatus } from '@/types'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { PhoneCall, Search, Download, ChevronRight } from 'lucide-react'
import { formatDate, formatRelativeTime, cn } from '@/lib/utils'

export default function CallsPage() {
  const [calls, setCalls] = useState<(Call & { business: Business | null })[]>([])
  const [search, setSearch] = useState('')
  const [selectedBusiness, setSelectedBusiness] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedUrgency, setSelectedUrgency] = useState<string>('all')

  const businesses = useMemo(() => localDB.getBusinesses(), [])

  useEffect(() => {
    setCalls(localDB.getCallsWithBusiness())
  }, [])

  const updateStatus = (id: string, newStatus: CallStatus, newFollowUp: Call['follow_up_status']) => {
    localDB.updateCall(id, { status: newStatus, follow_up_status: newFollowUp })
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
