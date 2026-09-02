'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Call, Business, BUSINESS_TYPES, CallStatus, Urgency } from '@/types'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  PhoneCall, Search, Filter, Download, ArrowUpDown,
  Calendar, CheckCircle2, AlertCircle, Clock, ChevronRight
} from 'lucide-react'
import { formatDate, formatRelativeTime, cn } from '@/lib/utils'

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedBusiness, setSelectedBusiness] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedUrgency, setSelectedUrgency] = useState('all')
  const supabase = createClient()

  const fetchCallsAndBusinesses = async () => {
    setLoading(true)
    const [{ data: callsData }, { data: bizData }] = await Promise.all([
      supabase
        .from('calls')
        .select('*, business:businesses(name, type), workflow:workflows(name)')
        .order('created_at', { ascending: false }),
      supabase.from('businesses').select('*')
    ])
    setCalls((callsData as Call[]) || [])
    setBusinesses(bizData || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchCallsAndBusinesses()
  }, [])

  const updateStatus = async (id: string, newStatus: CallStatus, newFollowUp: Call['follow_up_status']) => {
    const { error } = await supabase
      .from('calls')
      .update({ status: newStatus, follow_up_status: newFollowUp })
      .eq('id', id)

    if (error) {
      toast.error('Failed to update status')
    } else {
      toast.success('Status updated')
      setCalls(prev => prev.map(c => c.id === id ? { ...c, status: newStatus, follow_up_status: newFollowUp } : c))
    }
  }

  const filteredCalls = useMemo(() => {
    return calls.filter(call => {
      const matchesSearch =
        (call.caller_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (call.caller_phone || '').toLowerCase().includes(search.toLowerCase()) ||
        (call.summary || '').toLowerCase().includes(search.toLowerCase()) ||
        (call.intent || '').toLowerCase().includes(search.toLowerCase())

      const matchesBusiness = selectedBusiness === 'all' || call.business_id === selectedBusiness
      const matchesStatus = selectedStatus === 'all' || call.status === selectedStatus
      const matchesUrgency = selectedUrgency === 'all' || call.urgency === selectedUrgency

      return matchesSearch && matchesBusiness && matchesStatus && matchesUrgency
    })
  }, [calls, search, selectedBusiness, selectedStatus, selectedUrgency])

  const exportCSV = () => {
    if (filteredCalls.length === 0) {
      toast.error('No calls to export')
      return
    }

    const headers = ['Caller Name', 'Phone', 'Business', 'Intent', 'Urgency', 'Status', 'Follow-up', 'Created At', 'Summary']
    const rows = filteredCalls.map(c => [
      `"${c.caller_name || ''}"`,
      `"${c.caller_phone || ''}"`,
      `"${(c.business as { name?: string })?.name || ''}"`,
      `"${c.intent || ''}"`,
      `"${c.urgency || ''}"`,
      `"${c.status || ''}"`,
      `"${c.follow_up_status || ''}"`,
      `"${formatDate(c.created_at)}"`,
      `"${(c.summary || '').replace(/"/g, '""')}"`
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `voice_ai_calls_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('CSV downloaded')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold font-display">Customer Call Records</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Review captured customer details, transcripts, and manage follow-ups
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Download size={15} />
            Export CSV
          </button>
          <Link
            href="/simulator"
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <PhoneCall size={15} />
            Simulate Call
          </Link>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="glass-card p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-field pl-9 text-sm"
            placeholder="Search caller, phone, intent..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div>
          <select
            className="input-field text-sm"
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
            className="input-field text-sm"
            value={selectedUrgency}
            onChange={e => setSelectedUrgency(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="urgent">🔴 Urgent</option>
            <option value="normal">⚪ Normal</option>
            <option value="low">🟢 Low</option>
          </select>
        </div>

        <div>
          <select
            className="input-field text-sm"
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Follow-up Statuses</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Table / List View */}
      {loading ? (
        <div className="glass-card p-16 text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading customer calls...</p>
        </div>
      ) : filteredCalls.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <PhoneCall size={44} className="mx-auto mb-3 opacity-30" />
          <h3 className="font-semibold text-lg mb-1">No call records found</h3>
          <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
            {calls.length === 0
              ? 'Calls handled by your AI assistant will be captured and listed here.'
              : 'No records match your filter criteria.'}
          </p>
          <Link href="/simulator" className="btn-primary inline-flex items-center gap-2 text-sm">
            <PhoneCall size={15} />
            Test in Simulator
          </Link>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                  <th className="p-4 font-semibold text-xs" style={{ color: 'var(--text-secondary)' }}>CALLER</th>
                  <th className="p-4 font-semibold text-xs" style={{ color: 'var(--text-secondary)' }}>BUSINESS & INTENT</th>
                  <th className="p-4 font-semibold text-xs" style={{ color: 'var(--text-secondary)' }}>PRIORITY</th>
                  <th className="p-4 font-semibold text-xs" style={{ color: 'var(--text-secondary)' }}>FOLLOW-UP STATUS</th>
                  <th className="p-4 font-semibold text-xs" style={{ color: 'var(--text-secondary)' }}>DATE & TIME</th>
                  <th className="p-4 font-semibold text-xs text-right" style={{ color: 'var(--text-secondary)' }}>ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ '--tw-divide-color': 'var(--border)' } as React.CSSProperties}>
                {filteredCalls.map(call => {
                  const biz = call.business as { name: string; type: string } | null
                  const typeInfo = biz?.type ? BUSINESS_TYPES[biz.type as keyof typeof BUSINESS_TYPES] : null

                  return (
                    <tr key={call.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <Link href={`/calls/${call.id}`} className="block group">
                          <p className="font-medium group-hover:text-purple-400 transition-colors">
                            {call.caller_name || 'Anonymous Caller'}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {call.caller_phone || 'No phone provided'}
                          </p>
                        </Link>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{typeInfo?.icon || '🏢'}</span>
                          <div>
                            <p className="text-xs font-medium">{biz?.name || 'General'}</p>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {call.intent || 'General Enquiry'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={cn('badge', {
                          'badge-urgent': call.urgency === 'urgent',
                          'badge-new': call.urgency === 'normal',
                          'badge-completed': call.urgency === 'low'
                        })}>
                          {call.urgency === 'urgent' ? '🔴 Urgent' : call.urgency === 'normal' ? '⚪ Normal' : '🟢 Low'}
                        </span>
                      </td>
                      <td className="p-4">
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
                          className="bg-white/5 border border-white/10 rounded-lg text-xs py-1.5 px-2.5 outline-none cursor-pointer hover:border-purple-500/50 transition-colors"
                        >
                          <option value="pending">🟡 Pending</option>
                          <option value="contacted">🟣 Contacted</option>
                          <option value="resolved">🟢 Resolved</option>
                          <option value="closed">⚫ Closed</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <p className="text-xs font-medium">{formatRelativeTime(call.created_at)}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(call.created_at)}</p>
                      </td>
                      <td className="p-4 text-right">
                        <Link
                          href={`/calls/${call.id}`}
                          className="btn-secondary inline-flex items-center gap-1 text-xs py-1.5 px-3"
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
      )}
    </div>
  )
}
