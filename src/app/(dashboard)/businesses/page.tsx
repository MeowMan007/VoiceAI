'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Business, BUSINESS_TYPES } from '@/types'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Phone, ArrowRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const SEED_BUSINESSES: Business[] = [
  {
    id: 'biz-seed-1',
    owner_id: 'demo',
    name: 'Sweet Delights Bakery',
    type: 'cake_shop',
    phone: '+91 98765 43210',
    description: 'Fresh custom birthday, anniversary, and wedding cakes with same-day express delivery.',
    language: 'en',
    created_at: new Date(Date.now() - 1000 * 3600 * 48).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'biz-seed-2',
    owner_id: 'demo',
    name: 'Apex Family Clinic',
    type: 'clinic',
    phone: '+91 98111 22334',
    description: 'Primary healthcare and patient consultations. Automated appointment booking via Google Calendar.',
    language: 'en',
    created_at: new Date(Date.now() - 1000 * 3600 * 72).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'biz-seed-3',
    owner_id: 'demo',
    name: 'SwiftGo Express Logistics',
    type: 'delivery',
    phone: '+91 99887 76655',
    description: 'Intra-city parcel delivery, live courier status, and package routing support.',
    language: 'en',
    created_at: new Date(Date.now() - 1000 * 3600 * 96).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'biz-seed-4',
    owner_id: 'demo',
    name: 'Prestige Property Realty',
    type: 'real_estate',
    phone: '+91 97654 32100',
    description: 'Residential and commercial real estate advisory, property viewings, and buyer qualification.',
    language: 'en',
    created_at: new Date(Date.now() - 1000 * 3600 * 120).toISOString(),
    updated_at: new Date().toISOString()
  }
]

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>(SEED_BUSINESSES)
  const supabase = createClient()

  const fetchBusinesses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const query = user
        ? supabase.from('businesses').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
        : supabase.from('businesses').select('*').order('created_at', { ascending: false })

      const { data } = await query
      if (data && data.length > 0) {
        setBusinesses(data)
      } else {
        setBusinesses(SEED_BUSINESSES)
      }
    } catch {
      setBusinesses(SEED_BUSINESSES)
    }
  }

  useEffect(() => {
    fetchBusinesses()
  }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This will also remove associated workflows and calls.`)) return
    try {
      await supabase.from('businesses').delete().eq('id', id)
      setBusinesses(prev => prev.filter(b => b.id !== id))
      toast.success('Business profile deleted')
    } catch {
      setBusinesses(prev => prev.filter(b => b.id !== id))
      toast.success('Business profile removed')
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Business Profiles</h1>
          <p className="page-subtitle">
            Manage your small business configurations and voice assistant settings.
          </p>
        </div>
        <Link href="/businesses/new" id="add-business-btn" className="btn-primary">
          <Plus size={14} /> Add Business
        </Link>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '22px' }}>
        {businesses.map(biz => {
          const typeInfo = BUSINESS_TYPES[biz.type] || BUSINESS_TYPES.other
          return (
            <div
              key={biz.id}
              className="glass-card"
              style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '230px' }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <span
                      style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--green)', display: 'block', marginBottom: '4px' }}
                    >
                      {typeInfo.label}
                    </span>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>{biz.name}</h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Link
                      href={`/businesses/${biz.id}`}
                      id={`edit-biz-${biz.id}`}
                      style={{ padding: '6px', borderRadius: '6px', color: 'var(--text-muted)', display: 'inline-flex' }}
                      title="Edit"
                    >
                      <Pencil size={13} />
                    </Link>
                    <button
                      onClick={() => handleDelete(biz.id, biz.name)}
                      id={`delete-biz-${biz.id}`}
                      style={{ padding: '6px', borderRadius: '6px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex' }}
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                  {biz.description || 'No description provided.'}
                </p>
              </div>

              <div
                style={{ paddingTop: '16px', marginTop: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={12} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {biz.phone || 'No number set'}
                    </span>
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>English</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {formatDate(biz.created_at)}
                  </span>
                  <Link
                    href={`/workflows/new?business_id=${biz.id}`}
                    style={{ fontSize: '12px', fontWeight: 600, color: 'var(--green)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    Configure Workflow <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </div>
          )
        })}

        {/* Add New Card */}
        <Link
          href="/businesses/new"
          className="glass-card group"
          style={{
            padding: '32px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            textDecoration: 'none',
            borderStyle: 'dashed',
            minHeight: '230px'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
              background: 'var(--bg-inset)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)'
            }}
          >
            <Plus size={20} />
          </div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>Add Business Profile</p>
          <p style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-muted)', maxWidth: '200px', lineHeight: 1.5 }}>
            Bakeries, Clinics, Logistics, Real Estate, or Repair Services
          </p>
        </Link>
      </div>
    </div>
  )
}
