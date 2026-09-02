'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Business, BUSINESS_TYPES } from '@/types'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Plus, Building2, Pencil, Trash2, Phone, Globe, ExternalLink } from 'lucide-react'
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
    description: 'Primary health care and appointment scheduling. Automated Google Calendar booking.',
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
    description: 'Intra-city package delivery, live dispatch status, and shipment routing assistance.',
    language: 'en',
    created_at: new Date(Date.now() - 1000 * 3600 * 96).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'biz-seed-4',
    owner_id: 'demo',
    name: 'रॉयल बेकर्स (Royal Bakers)',
    type: 'cake_shop',
    phone: '+91 97654 32100',
    description: 'प्रीमियम केक, पेस्ट्री और पार्टी ऑर्डर्स के लिए हिंदी वॉयस असिस्टेंट।',
    language: 'hi',
    created_at: new Date(Date.now() - 1000 * 3600 * 120).toISOString(),
    updated_at: new Date().toISOString()
  }
]

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>(SEED_BUSINESSES)
  const [loading, setLoading] = useState(true)
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
    } finally {
      setLoading(false)
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
      toast.success('Business deleted')
    } catch {
      setBusinesses(prev => prev.filter(b => b.id !== id))
      toast.success('Business removed')
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-white">Business Profiles</h1>
          <p className="text-xs lg:text-sm text-zinc-400 mt-1">
            Configure your small business entities and customize their voice assistant behavior.
          </p>
        </div>
        <Link
          href="/businesses/new"
          id="add-business-btn"
          className="btn-primary text-xs py-2 px-3.5"
        >
          <Plus size={14} /> Add New Business
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {businesses.map(biz => {
          const typeInfo = BUSINESS_TYPES[biz.type] || BUSINESS_TYPES.other
          return (
            <div
              key={biz.id}
              className="glass-card p-5 flex flex-col justify-between hover:border-zinc-700 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{typeInfo.icon}</span>
                    <div>
                      <h3 className="font-semibold text-sm text-white tracking-tight">{biz.name}</h3>
                      <p className="text-[11px] text-emerald-400 font-medium">{typeInfo.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/businesses/${biz.id}`}
                      id={`edit-biz-${biz.id}`}
                      className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                      title="Edit Profile"
                    >
                      <Pencil size={13} />
                    </Link>
                    <button
                      onClick={() => handleDelete(biz.id, biz.name)}
                      id={`delete-biz-${biz.id}`}
                      className="p-1.5 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete Profile"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 mb-4">
                  {biz.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 space-y-1.5 text-[11px] text-zinc-400">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Phone size={11} className="text-zinc-500" />
                    {biz.phone || 'Direct missed-call line'}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-white">
                    <Globe size={11} className="text-emerald-400" />
                    {biz.language === 'hi' ? 'Hindi' : 'English'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-zinc-500">Created: {formatDate(biz.created_at)}</span>
                  <Link
                    href={`/workflows/new?business_id=${biz.id}`}
                    className="text-emerald-400 hover:underline inline-flex items-center gap-0.5 font-medium"
                  >
                    Add Workflow &rarr;
                  </Link>
                </div>
              </div>
            </div>
          )
        })}

        {/* Add Business Tile */}
        <Link
          href="/businesses/new"
          className="glass-card p-6 flex flex-col items-center justify-center text-center border-dashed hover:border-emerald-500/50 hover:bg-zinc-950 transition-all min-h-[190px] group"
        >
          <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 group-hover:border-emerald-500/40 mb-2 transition-colors">
            <Plus size={18} />
          </div>
          <p className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors">
            Create Another Business Profile
          </p>
          <p className="text-[11px] text-zinc-500 mt-1 max-w-[200px]">
            Support clinics, repair shops, bakeries, or delivery hubs.
          </p>
        </Link>
      </div>
    </div>
  )
}
