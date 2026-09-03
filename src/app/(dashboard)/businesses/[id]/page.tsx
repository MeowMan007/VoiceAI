'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getUser } from '@/lib/demo-auth'
import { localDB } from '@/lib/local-db'
import toast from 'react-hot-toast'
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const BUSINESS_TYPES = [
  { key: 'Bakery', label: '🎂 Bakery & Cake Shop', description: 'Handle cake orders, custom requests, and delivery queries' },
  { key: 'Healthcare', label: '🏥 Clinic & Healthcare', description: 'Manage appointments, patient enquiries, and scheduling' },
  { key: 'Real Estate', label: '🏠 Real Estate & Properties', description: 'Qualify leads, schedule viewings, and handle property enquiries' },
  { key: 'Delivery', label: '🚚 Logistics & Delivery', description: 'Manage delivery requests, tracking, and logistics queries' },
  { key: 'Restaurant', label: '🍽️ Restaurant & Food', description: 'Handle reservations, takeaway orders, and customer queries' },
  { key: 'Repair', label: '🔧 Maintenance & Repairs', description: 'Handle service requests, urgency, and scheduling visits' },
  { key: 'Salon', label: '💇 Salon & Beauty', description: 'Manage appointments, service enquiries, and bookings' },
  { key: 'Other', label: '🏢 General Business', description: 'Custom workflow for any business type' },
]

export default function BusinessFormPage() {
  const router = useRouter()
  const params = useParams()
  const isNew = params?.id === 'new'
  const [userId, setUserId] = useState('')

  const [form, setForm] = useState({
    name: '',
    type: 'Bakery',
    phone: '',
    email: '',
    description: '',
    greeting: '',
    language: 'en',
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const user = getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)

    if (!isNew && params?.id) {
      setLoading(true)
      const biz = localDB.businesses.get(params.id as string)
      if (biz) {
        setForm({
          name: biz.name,
          type: biz.type,
          phone: biz.phone || '',
          email: biz.email || '',
          description: biz.description || '',
          greeting: biz.greeting || '',
          language: biz.language || 'en',
        })
      } else {
        toast.error('Business not found')
        router.push('/businesses')
      }
      setLoading(false)
    }
  }, [isNew, params?.id, router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Business name is required'); return }
    setSaving(true)

    try {
      if (isNew) {
        localDB.businesses.create({ ...form, userId })
        toast.success('Business profile created!')
      } else {
        localDB.businesses.update(params?.id as string, form)
        toast.success('Business profile updated!')
      }
      router.push('/businesses')
    } catch {
      toast.error('Save failed. Please try again.')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-5">
        <Link
          href="/businesses"
          id="back-to-businesses"
          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            {isNew ? 'New Business Profile' : 'Edit Business Profile'}
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure industry category, voice assistant greeting defaults, and business metadata.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Industry Category Selector */}
        <div className="glass-card p-5 space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Select Industry Category
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {BUSINESS_TYPES.map(({ key, label, description }) => {
              const selected = form.type === key
              return (
                <button
                  key={key}
                  type="button"
                  id={`biz-type-${key}`}
                  onClick={() => setForm(f => ({ ...f, type: key }))}
                  className={cn(
                    'p-3 rounded-lg text-left transition-all border text-xs flex flex-col justify-between',
                    selected
                      ? 'bg-emerald-500/10 border-emerald-500 text-white'
                      : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  )}
                >
                  <div className="text-2xl mb-1.5">{label.split(' ')[0]}</div>
                  <div>
                    <div className="font-medium text-white">{label.split(' ').slice(1).join(' ')}</div>
                    <div className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">{description}</div>
                  </div>
                  {selected && (
                    <div className="mt-2 text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Selected
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Business Details Fields */}
        <div className="glass-card p-5 space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Business Details
          </label>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Business Name <span className="text-emerald-400">*</span>
            </label>
            <input
              id="business-name"
              type="text"
              className="input-field"
              placeholder="e.g. Sweet Delights Bakery or Apex Clinic"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Phone Number</label>
              <input
                id="business-phone"
                type="tel"
                className="input-field"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Email</label>
              <input
                id="business-email"
                type="email"
                className="input-field"
                placeholder="hello@yourbusiness.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Conversation Language
            </label>
            <select
              id="business-language"
              className="input-field"
              value={form.language}
              onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
            >
              <option value="en">English (Default)</option>
              <option value="hi">Hindi (हिंदी)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Description & Business Context
            </label>
            <textarea
              id="business-description"
              className="input-field resize-none"
              rows={3}
              placeholder="Brief context for the AI voice assistant about your offerings, opening hours, or delivery radius..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Greeting Message (Optional)
            </label>
            <textarea
              id="business-greeting"
              className="input-field resize-none"
              rows={2}
              placeholder="Thank you for calling [Business Name]! How can I assist you today?"
              value={form.greeting}
              onChange={e => setForm(f => ({ ...f, greeting: e.target.value }))}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/businesses" className="btn-secondary text-xs">
            Cancel
          </Link>
          <button
            id="save-business-btn"
            type="submit"
            disabled={saving || !form.name.trim()}
            className="btn-primary text-xs py-2 px-4"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Saving...' : (isNew ? 'Create Business' : 'Save Changes')}
          </button>
        </div>
      </form>
    </div>
  )
}
