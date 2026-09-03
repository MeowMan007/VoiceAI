'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/demo-auth'
import { localDB, CallRecord, Business } from '@/lib/local-db'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { PhoneCall, Search, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

function formatRelativeTime(iso: string): string {
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
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

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
      const biz = businessMap[c.businessId]
      const matchSearch = !search ||
        c.callerName?.toLowerCase().includes(search.toLowerCase()) ||
        c.callerPhone?.includes(search) ||
        c.summary?.toLowerCase().includes(search.toLowerCase()) ||
        biz?.name.toLowerCase().includes(search.toLowerCase())
      const matchBiz = selectedBusiness === 'all' || c.businessId === selectedBusiness
      const matchStatus = selectedStatus === 'all' || c.status === selectedStatus
      return matchSearch && matchBiz && matchStatus
    })
  }, [calls, search, selectedBusiness, selectedStatus, businessMap])

  const handleDelete = (id: string) => {
    if (!confirm('Delete this call record?')) return
    localDB.calls.delete(id)
    setCalls(prev => prev.filter(c => c.id !== id))
    toast.success('Call record deleted')
  }

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
          <h1 className="page-title">Call Records</h1>
          <p className="page-subtitle">
            All missed calls handled by your Voice AI assistant — with transcripts and summaries.
          </p>
        </div>
        <span className="badge badge-completed">{calls.length} Total</span>
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
            placeholder="Search caller name, phone, or summary..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select id="filter-business" className="input-field" style={{ width: 'auto' }} value={selectedBusiness} onChange={e => setSelectedBusiness(e.target.value)}>
          <option value="all">All Businesses</option>
          {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        <select id="filter-status" className="input-field" style={{ width: 'auto' }} value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="missed">Missed</option>
          <option value="in-progress">In Progress</option>
        </select>
      </div>

      {/* Calls List */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <PhoneCall size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No call records found.</p>
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
              display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr auto auto',
              padding: '10px 20px', borderBottom: '1px solid var(--border-subtle)',
              fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: 'var(--text-muted)'
            }}>
              <span>Caller</span>
              <span>Business</span>
              <span>Status</span>
              <span>Duration</span>
              <span>Time</span>
            </div>
            {filtered.map(call => {
              const biz = businessMap[call.businessId]
              return (
                <Link
                  key={call.id}
                  href={`/calls/${call.id}`}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr auto auto', padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', textDecoration: 'none', alignItems: 'center', gap: '12px', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{call.callerName || 'Anonymous'}</p>
                    <p style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '2px' }}>{call.callerPhone || '—'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#fff' }}>{biz?.name || 'Unknown'}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{call.summary?.slice(0, 50) || '—'}</p>
                  </div>
                  <div>
                    <span className={cn('badge', {
                      'badge-completed': call.status === 'completed',
                      'badge-urgent': call.status === 'missed',
                      'badge-pending': call.status === 'in-progress',
                    })}>
                      {call.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {call.duration ? `${call.duration}s` : '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {formatRelativeTime(call.createdAt)}
                    <ChevronRight size={12} />
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
