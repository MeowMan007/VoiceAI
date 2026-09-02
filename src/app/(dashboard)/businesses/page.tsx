'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Business, BUSINESS_TYPES } from '@/types'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Plus, Building2, Pencil, Trash2, Phone, Globe, ArrowRight } from 'lucide-react'
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
    <div className="p-8 lg:p-10 max-w-7xl w-full mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-display">Business Profiles</h1>
          <p className="text-sm text-zinc-400 mt-1.5">
            Manage your small business configurations and customize voice assistant handling.
          </p>
        </div>
        <Link
          href="/businesses/new"
          id="add-business-btn"
          className="btn-primary text-xs py-2.5 px-4 shadow-sm"
        >
          <Plus size={14} /> Add Business Profile
        </Link>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {businesses.map(biz => {
          const typeInfo = BUSINESS_TYPES[biz.type] || BUSINESS_TYPES.other
          return (
            <div
              key={biz.id}
              className="glass-card p-6 flex flex-col justify-between hover:border-zinc-700 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
                      {typeInfo.label}
                    </span>
                    <h3 className="font-bold text-base text-white tracking-tight">{biz.name}</h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/businesses/${biz.id}`}
                      id={`edit-biz-${biz.id}`}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                      title="Edit Profile"
                    >
                      <Pencil size={14} />
                    </Link>
                    <button
                      onClick={() => handleDelete(biz.id, biz.name)}
                      id={`delete-biz-${biz.id}`}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete Profile"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                  {biz.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-800/80 space-y-2 text-xs text-zinc-400">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Phone size={13} className="text-zinc-500" />
                    <span className="text-zinc-300 font-mono text-[11px]">{biz.phone || 'Direct line'}</span>
                  </span>
                  <span className="text-zinc-400 text-[11px]">
                    English
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-zinc-500 text-[11px]">Created {formatDate(biz.created_at)}</span>
                  <Link
                    href={`/workflows/new?business_id=${biz.id}`}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold text-xs inline-flex items-center gap-1"
                  >
                    Configure Workflow <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          )
        })}

        {/* Add Business Tile */}
        <Link
          href="/businesses/new"
          className="glass-card p-8 flex flex-col items-center justify-center text-center border-dashed hover:border-emerald-500/50 hover:bg-zinc-950 transition-all min-h-[220px] group"
        >
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 group-hover:border-emerald-500/40 mb-3 transition-colors">
            <Plus size={20} />
          </div>
          <p className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
            Create Business Profile
          </p>
          <p className="text-xs text-zinc-500 mt-1 max-w-[220px] leading-relaxed">
            Bakeries, Clinics, Logistics, Real Estate, or Repair Services.
          </p>
        </Link>
      </div>
    </div>
  )
}
