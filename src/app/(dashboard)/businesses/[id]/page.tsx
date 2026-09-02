'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BUSINESS_TYPES, BusinessType, Language } from '@/types'
import toast from 'react-hot-toast'
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function BusinessFormPage() {
  const router = useRouter()
  const params = useParams()
  const isNew = params?.id === 'new'
  const supabase = createClient()

  const [form, setForm] = useState({
    name: '', type: 'cake_shop' as BusinessType,
    phone: '', description: '', language: 'en' as Language
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isNew && params?.id) {
      setLoading(true)
      supabase.from('businesses').select('*').eq('id', params.id as string).single()
        .then(({ data }) => {
          if (data) setForm({ name: data.name, type: data.type, phone: data.phone || '', description: data.description || '', language: data.language })
          setLoading(false)
        })
    }
  }, [params?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); setSaving(false); return }

    if (isNew) {
      const { error } = await supabase.from('businesses').insert({ ...form, owner_id: user.id })
      if (error) toast.error(error.message)
      else { toast.success('Business created!'); router.push('/businesses') }
    } else {
      const { error } = await supabase.from('businesses').update(form).eq('id', params?.id as string)
      if (error) toast.error(error.message)
      else { toast.success('Business updated!'); router.push('/businesses') }
    }
    setSaving(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/businesses" id="back-to-businesses"
          className="p-2 rounded-lg btn-secondary">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold font-display">{isNew ? 'New Business' : 'Edit Business'}</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {isNew ? 'Create a business profile to configure your AI assistant' : 'Update your business details'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Business Type */}
        <div className="glass-card p-5">
          <label className="block text-sm font-semibold mb-4">Business Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(Object.entries(BUSINESS_TYPES) as [BusinessType, typeof BUSINESS_TYPES[BusinessType]][]).map(([key, info]) => (
              <button
                key={key}
                type="button"
                id={`biz-type-${key}`}
                onClick={() => setForm(f => ({ ...f, type: key }))}
                className="p-3 rounded-xl text-left transition-all"
                style={{
                  background: form.type === key ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${form.type === key ? 'rgba(139,92,246,0.5)' : 'var(--border)'}`,
                }}
              >
                <div className="text-2xl mb-1">{info.icon}</div>
                <div className="text-xs font-medium">{info.label}</div>
                {form.type === key && (
                  <CheckCircle2 size={12} className="mt-1" style={{ color: 'var(--accent-purple)' }} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="glass-card p-5 space-y-4">
          <label className="block text-sm font-semibold">Business Details</label>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Business Name *
            </label>
            <input id="business-name" type="text" className="input-field"
              placeholder="e.g. Sweet Delights Bakery"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Phone Number
            </label>
            <input id="business-phone" type="tel" className="input-field"
              placeholder="+91 98765 43210"
              value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Description
            </label>
            <textarea id="business-description" className="input-field resize-none" rows={3}
              placeholder="Brief description of your business..."
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Default Language
            </label>
            <select id="business-language" className="input-field"
              value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value as Language }))}>
              <option value="en">English</option>
              <option value="hi">Hindi (हिंदी)</option>
            </select>
          </div>
        </div>

        <button id="save-business-btn" type="submit" disabled={saving}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3">
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? 'Saving...' : (isNew ? 'Create Business' : 'Save Changes')}
        </button>
      </form>
    </div>
  )
}
