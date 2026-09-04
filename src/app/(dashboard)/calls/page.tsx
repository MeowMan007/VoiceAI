'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/demo-auth'
import { localDB, CallRecord, Business } from '@/lib/local-db'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { PhoneCall, Search, ChevronRight, Calendar, AlertTriangle, CheckCircle2, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

function formatRelativeTime(iso?: string): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function CallsPage() {
  const router = useRouter()
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [businessMap, setBusinessMap] = useState<Record<string, Business>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedBusiness, setSelectedBusiness] = useState<string>('all')
  const [selectedFollowUp, setSelectedFollowUp] = useState<string>('all')
  const [selectedUrgency, setSelectedUrgency] = useState<string>('all')

  useEffect(() => {
    const user = getUser()
    if (!user) { router.push('/login'); return }

    const allCalls = localDB.calls.list(user.id)
    const allBiz = localDB.businesses.list(user.id)
    const bmap: Record<string, Business> = {}
    allBiz.forEach(b => { bmap[b.id] = b })

    setCalls(allCalls)
    setBusinesses(allBiz)
    setBusinessMap(bmap)
    setLoading(false)
  }, [router])

  const filtered = useMemo(() => {
    return calls.filter(c => {
      const bizId = c.business_id || c.businessId || ''
      const biz = businessMap[bizId]
      const name = c.caller_name || c.callerName || ''
      const phone = c.caller_phone || c.callerPhone || ''
      const summary = c.summary || ''
      const intent = c.intent || ''

      const matchSearch = !search ||
        name.toLowerCase().includes(search.toLowerCase()) ||
        phone.includes(search) ||
        summary.toLowerCase().includes(search.toLowerCase()) ||
        intent.toLowerCase().includes(search.toLowerCase()) ||
        (biz?.name || '').toLowerCase().includes(search.toLowerCase())

      const matchBiz = selectedBusiness === 'all' || bizId === selectedBusiness
      const followUp = c.follow_up_status || (c as any).followUpStatus || 'pending'
      const matchFollowUp = selectedFollowUp === 'all' || followUp === selectedFollowUp
      const matchUrgency = selectedUrgency === 'all' || c.urgency === selectedUrgency

      return matchSearch && matchBiz && matchFollowUp && matchUrgency
    })
  }, [calls, search, selectedBusiness, selectedFollowUp, selectedUrgency, businessMap])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Calls &amp; Follow-Ups</h1>
          <p className="page-subtitle">
            All missed calls handled by your Voice AI assistant — classified with customer intent, captured details, and urgency.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-completed">{calls.length} Total</span>
          <span className="badge badge-urgent">{calls.filter(c => c.urgency === 'urgent').length} Urgent</span>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            id="call-search"
            type="text"
            className="input-field"
            style={{ paddingLeft: '36px' }}
            placeholder="Search caller name, phone, intent, or keywords..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select id="filter-business" className="input-field" style={{ width: 'auto', fontSize: '12px' }} value={selectedBusiness} onChange={e => setSelectedBusiness(e.target.value)}>
          <option value="all">All Businesses</option>
          {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        <select id="filter-urgency" className="input-field" style={{ width: 'auto', fontSize: '12px' }} value={selectedUrgency} onChange={e => setSelectedUrgency(e.target.value)}>
          <option value="all">All Priorities</option>
          <option value="urgent">⚡ Urgent Priority</option>
          <option value="normal">Normal Priority</option>
        </select>

        <select id="filter-followup" className="input-field" style={{ width: 'auto', fontSize: '12px' }} value={selectedFollowUp} onChange={e => setSelectedFollowUp(e.target.value)}>
          <option value="all">All Follow-Up</option>
          <option value="pending">Pending Follow-Up</option>
          <option value="contacted">Contacted</option>
          <option value="resolved">Resolved / Completed</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Calls List */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <PhoneCall size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No call records found matching criteria.</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
              Run the Voice Simulator to generate call records.
            </p>
            <Link href="/simulator" className="btn-primary" style={{ marginTop: '16px', display: 'inline-flex' }}>
              Open Voice Simulator
            </Link>
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 1.2fr 1fr auto',
              padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)',
              fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: 'var(--text-muted)'
            }}>
              <span>Caller &amp; Phone</span>
              <span>Business &amp; Intent</span>
              <span>Follow-Up &amp; Priority</span>
              <span>Date / Time</span>
              <span></span>
            </div>

            {filtered.map(call => {
              const bizId = call.business_id || call.businessId || ''
              const biz = businessMap[bizId]
              const isUrgent = call.urgency === 'urgent'
              const followUp = call.follow_up_status || (call as any).followUpStatus || 'pending'
              const callerName = call.caller_name || call.callerName || 'Anonymous Caller'
              const callerPhone = call.caller_phone || call.callerPhone || 'Direct line'
              const createdAt = call.created_at || (call as any).createdAt

              return (
                <Link
                  key={call.id}
                  href={`/calls/${call.id}`}
                  style={{
                    display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 1.2fr 1fr auto',
                    padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)',
                    textDecoration: 'none', alignItems: 'center', gap: '12px', transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{callerName}</p>
                    <p style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '2px' }}>{callerPhone}</p>
                  </div>

                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#fff' }}>{biz?.name || 'General Business'}</p>
                    <p style={{ fontSize: '11px', color: 'var(--green)', marginTop: '2px' }}>
                      {call.intent || call.summary?.slice(0, 45) || 'General Inquiry'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span className={cn('badge text-[10px]', {
                      'badge-urgent': followUp === 'pending',
                      'badge-contacted': followUp === 'contacted',
                      'badge-completed': followUp === 'resolved',
                      'badge-closed': followUp === 'closed',
                    })}>
                      {followUp.toUpperCase()}
                    </span>

                    {isUrgent && (
                      <span className="badge badge-urgent text-[10px] flex items-center gap-1">
                        <AlertTriangle size={10} /> URGENT
                      </span>
                    )}

                    {call.calendar_event_id && (
                      <span className="badge badge-contacted text-[10px] flex items-center gap-1" title="Google Calendar Event Created">
                        <Calendar size={10} /> Cal
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {formatRelativeTime(createdAt)}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                    <ChevronRight size={14} />
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
