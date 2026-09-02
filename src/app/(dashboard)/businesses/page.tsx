'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Business, BUSINESS_TYPES } from '@/types'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Plus, Building2, Pencil, Trash2, Phone, Globe } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchBusinesses = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('businesses').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
    setBusinesses(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchBusinesses() }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This will also delete all associated workflows and calls.`)) return
    const { error } = await supabase.from('businesses').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Business deleted'); fetchBusinesses() }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-display">Business Profiles</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Manage your businesses and their AI assistant configurations
          </p>
        </div>
        <Link href="/businesses/new" id="add-business-btn"
          className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Add Business
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading...
        </div>
      ) : businesses.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Building2 size={48} className="mx-auto mb-4 opacity-30" />
          <h3 className="font-semibold text-lg mb-2">No businesses yet</h3>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Create your first business profile to start configuring AI voice workflows
          </p>
          <Link href="/businesses/new" id="create-first-business-btn" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> Create Business
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {businesses.map(biz => {
            const typeInfo = BUSINESS_TYPES[biz.type]
            return (
              <div key={biz.id} className="glass-card p-5 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl`}
                    style={{ background: `linear-gradient(135deg, ${typeInfo.color.includes('pink') ? 'rgba(236,72,153,0.2)' : 'rgba(139,92,246,0.2)'}, rgba(59,130,246,0.2))` }}>
                    {typeInfo.icon}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/businesses/${biz.id}`} id={`edit-biz-${biz.id}`}
                      className="p-2 rounded-lg transition-colors btn-secondary">
                      <Pencil size={14} />
                    </Link>
                    <button onClick={() => handleDelete(biz.id, biz.name)} id={`delete-biz-${biz.id}`}
                      className="p-2 rounded-lg transition-colors"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-base mb-1">{biz.name}</h3>
                <p className="text-xs mb-3" style={{ color: 'var(--accent-purple)' }}>{typeInfo.label}</p>
                {biz.description && (
                  <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                    {biz.description}
                  </p>
                )}
                <div className="space-y-1.5 mt-auto pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  {biz.phone && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <Phone size={12} /> {biz.phone}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <Globe size={12} /> {biz.language === 'hi' ? 'Hindi' : 'English'}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Created {formatDate(biz.created_at)}
                  </div>
                </div>
              </div>
            )
          })}
          <Link href="/businesses/new"
            className="glass-card p-5 flex flex-col items-center justify-center text-center hover:border-purple-500/50 transition-colors border-dashed"
            style={{ borderStyle: 'dashed', minHeight: '200px' }}>
            <Plus size={32} className="mb-2 opacity-30" />
            <p className="font-medium text-sm">Add Another Business</p>
          </Link>
        </div>
      )}
    </div>
  )
}
