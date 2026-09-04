'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { getUser } from '@/lib/demo-auth'
import { localDB, Business, Workflow } from '@/lib/local-db'
import { WorkflowField, WorkflowCondition, Language, WORKFLOW_TEMPLATES, BusinessType } from '@/types'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Plus, Trash2, Loader2, CheckCircle2,
  GitBranch, Calendar, Sparkles, AlertCircle, Play, PhoneIncoming, Languages
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const PRESET_TEMPLATES: Array<{ key: BusinessType; label: string; desc: string }> = [
  { key: 'cake_shop', label: '🎂 Cake Shop / Bakery', desc: 'Order intake, flavour, weight, delivery date (<24h urgent condition)' },
  { key: 'clinic', label: '🏥 Clinic & Doctor', desc: 'Appointment booking, doctor preference, Google Calendar slot creation' },
  { key: 'delivery', label: '📦 Delivery & Logistics', desc: 'New parcel dispatch, tracking lookup via API, order validation' },
  { key: 'real_estate', label: '🏢 Real Estate & Property', desc: 'Buyer/tenant qualification, site visit scheduling on calendar' },
  { key: 'repair', label: '🔧 Maintenance & Repairs', desc: 'Issue intake, emergency priority flag, scheduled technician visit' },
]

function uid(prefix: string = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`
}

function WorkflowFormContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const isNew = params?.id === 'new'
  const [userId, setUserId] = useState('')

  const [businesses, setBusinesses] = useState<Business[]>([])
  const [saving, setSaving] = useState(false)

  // Full Prompt-Compliant Workflow State
  const [name, setName] = useState('')
  const [businessId, setBusinessId] = useState(searchParams?.get('business_id') || '')
  const [trigger, setTrigger] = useState('missed_call')
  const [greeting, setGreeting] = useState("Hi! Thanks for calling [Business Name]. Sorry we missed your call. I'm your Voice AI assistant. How can I help you today?")
  const [closingMessage, setClosingMessage] = useState("Thank you! We've captured all your details and our team will get back to you shortly.")
  const [language, setLanguage] = useState<Language>('en')
  const [calendarEnabled, setCalendarEnabled] = useState(true)
  const [postAction, setPostAction] = useState('create_record')
  const [isActive, setIsActive] = useState(true)
  const [fields, setFields] = useState<WorkflowField[]>([
    { id: 'f1', label: 'Customer Name', key: 'caller_name', type: 'text', required: true, order: 1 },
    { id: 'f2', label: 'Contact Number', key: 'contact_number', type: 'text', required: true, order: 2 },
    { id: 'f3', label: 'Preferred Date', key: 'preferred_date', type: 'date', required: false, order: 3 },
  ])
  const [conditions, setConditions] = useState<WorkflowCondition[]>([
    { id: 'c1', field: 'preferred_date', operator: 'less_than', value: '24', action: 'mark_urgent', action_label: 'If required within 24 hours → mark as urgent' },
  ])

  useEffect(() => {
    const user = getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)

    const bizs = localDB.businesses.list(user.id)
    setBusinesses(bizs)

    if (!isNew && params?.id) {
      const wf = localDB.workflows.get(params.id as string)
      if (wf) {
        setName(wf.name || '')
        setBusinessId(wf.business_id || (wf as any).businessId || '')
        setTrigger(wf.trigger || 'missed_call')
        setGreeting(wf.greeting || '')
        setClosingMessage(wf.closing_message || '')
        setLanguage(wf.language || 'en')
        setCalendarEnabled(!!wf.calendar_enabled)
        setPostAction(wf.post_action || 'create_record')
        setIsActive(wf.is_active !== false && (wf as any).isActive !== false)
        setFields(wf.fields && wf.fields.length ? wf.fields : [])
        setConditions(wf.conditions && wf.conditions.length ? wf.conditions : [])
      } else {
        toast.error('Workflow not found')
        router.push('/workflows')
      }
    } else if (isNew && bizs.length > 0 && !searchParams?.get('business_id')) {
      setBusinessId(bizs[0].id)
    }
  }, [isNew, params?.id, router, searchParams])

  const applyTemplate = (tmplKey: BusinessType) => {
    const template = WORKFLOW_TEMPLATES[tmplKey]
    if (!template) return

    setName(template.name || '')
    if (template.greeting) setGreeting(template.greeting)
    if (template.closing_message) setClosingMessage(template.closing_message)
    if (template.fields) setFields(template.fields)
    if (template.conditions) setConditions(template.conditions)
    setCalendarEnabled(!!template.calendar_enabled)
    setPostAction(template.post_action || 'create_record')

    toast.success(`Loaded "${template.name}" template`)
  }

  // Field Manipulation
  const addField = () => {
    const newF: WorkflowField = {
      id: uid('f'),
      label: 'New Field',
      key: `field_${Math.random().toString(36).slice(2, 6)}`,
      type: 'text',
      required: false,
      order: fields.length + 1,
    }
    setFields([...fields, newF])
  }

  const updateField = (idx: number, updates: Partial<WorkflowField>) => {
    const next = [...fields]
    next[idx] = { ...next[idx], ...updates }
    setFields(next)
  }

  const removeField = (idx: number) => {
    setFields(fields.filter((_, i) => i !== idx))
  }

  // Condition Manipulation
  const addCondition = () => {
    const firstFieldKey = fields[0]?.key || 'general'
    const newC: WorkflowCondition = {
      id: uid('c'),
      field: firstFieldKey,
      operator: 'equals',
      value: 'urgent',
      action: 'mark_urgent',
      action_label: 'Mark enquiry as urgent',
    }
    setConditions([...conditions, newC])
  }

  const updateCondition = (idx: number, updates: Partial<WorkflowCondition>) => {
    const next = [...conditions]
    next[idx] = { ...next[idx], ...updates }
    setConditions(next)
  }

  const removeCondition = (idx: number) => {
    setConditions(conditions.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId) { toast.error('Please select a business'); return }
    if (!name.trim()) { toast.error('Workflow name is required'); return }
    setSaving(true)

    const payload = {
      business_id: businessId,
      name: name.trim(),
      trigger,
      greeting: greeting.trim(),
      closing_message: closingMessage.trim(),
      language,
      calendar_enabled: calendarEnabled,
      post_action: postAction,
      is_active: isActive,
      fields,
      conditions,
    }

    try {
      if (isNew) {
        const created = localDB.workflows.create(payload)
        toast.success('Workflow created!')
        router.push(`/simulator?workflow=${created.id}`)
      } else {
        localDB.workflows.update(params?.id as string, payload)
        toast.success('Workflow updated!')
        router.push('/workflows')
      }
    } catch {
      toast.error('Failed to save workflow')
    } finally {
      setSaving(false)
    }
  }

  const selectedBiz = businesses.find(b => b.id === businessId)

  return (
    <div className="p-6 lg:p-8 max-w-4xl w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <Link href="/workflows" className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                {isNew ? 'Create Custom Workflow' : 'Edit Workflow'}
              </h1>
              <span className="badge badge-completed">Missed-Call Trigger</span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Configure greeting, data collection fields, conditional urgency branches, and post-call actions.
            </p>
          </div>
        </div>

        {!isNew && params?.id && (
          <Link
            href={`/simulator?workflow=${params.id}`}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <Play size={12} fill="currentColor" /> Test in Simulator
          </Link>
        )}
      </div>

      {/* Quick-Load Industry Templates */}
      <div className="glass-card p-5 space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
          <Sparkles size={13} /> Quick-Load Industry Preset
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {PRESET_TEMPLATES.map(tmpl => (
            <button
              key={tmpl.key}
              type="button"
              onClick={() => applyTemplate(tmpl.key)}
              className="p-3 rounded-lg text-left transition-all border text-xs bg-zinc-900/50 border-zinc-800 hover:border-emerald-500 hover:bg-emerald-500/5"
            >
              <div className="font-semibold text-white mb-1">{tmpl.label}</div>
              <div className="text-zinc-400 text-[11px] leading-relaxed">{tmpl.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Basic Configuration & Trigger */}
        <div className="glass-card p-5 space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400">
            1. Basic Settings & Trigger
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Business <span className="text-emerald-400">*</span>
              </label>
              <select
                id="workflow-business"
                className="input-field"
                value={businessId}
                onChange={e => setBusinessId(e.target.value)}
                required
              >
                <option value="">Select a business...</option>
                {businesses.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.type})</option>
                ))}
              </select>
              {businesses.length === 0 && (
                <p className="text-xs mt-1.5 text-zinc-500">
                  No businesses found. <Link href="/businesses/new" className="text-emerald-400 underline">Create one first →</Link>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Workflow Name <span className="text-emerald-400">*</span>
              </label>
              <input
                id="workflow-name"
                type="text"
                className="input-field"
                placeholder="e.g. Cake Order Intake, Appointment Booking..."
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Workflow Trigger
              </label>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white">
                <PhoneIncoming size={14} className="text-emerald-400 shrink-0" />
                <span className="font-semibold">Missed Call</span>
                <span className="text-zinc-500 text-[11px]">— Automated callback assistance</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Languages size={13} className="text-emerald-400" /> Assistant Language
              </label>
              <select
                id="workflow-language"
                className="input-field"
                value={language}
                onChange={e => setLanguage(e.target.value as Language)}
              >
                <option value="en">English</option>
                <option value="hi">Hindi (हिंदी)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Step 2: Opening Greeting */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400">
              2. Opening Greeting Message
            </label>
            <span className="text-[11px] text-zinc-400">Use <code className="text-emerald-400 font-mono">[Business Name]</code> as variable</span>
          </div>
          <textarea
            id="workflow-greeting"
            className="input-field text-xs leading-relaxed"
            rows={3}
            value={greeting}
            onChange={e => setGreeting(e.target.value)}
            placeholder="Hello! Thanks for calling [Business Name]. Sorry we missed your call..."
            required
          />
          <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-zinc-300">
            <span className="text-emerald-400 font-semibold">Live Preview: </span>
            &ldquo;{greeting.replace(/\[Business Name\]/g, selectedBiz?.name || 'Your Business')}&rdquo;
          </div>
        </div>

        {/* Step 3: Information to Collect (Questions & Data Fields) */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400">
                3. Questions & Data Fields to Collect
              </label>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Define what customer details the Voice AI assistant collects during the call.
              </p>
            </div>
            <button
              type="button"
              onClick={addField}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <Plus size={12} /> Add Field
            </button>
          </div>

          <div className="space-y-2.5">
            {fields.map((field, idx) => (
              <div
                key={field.id || idx}
                className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs space-y-2.5 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-[10px] font-mono">
                      {idx + 1}
                    </span>
                    {field.label || 'New Question'}
                    {field.required && <span className="text-red-400 text-xs">*</span>}
                  </span>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={e => updateField(idx, { required: e.target.checked })}
                        className="rounded border-zinc-700 text-emerald-500"
                      />
                      Required
                    </label>

                    <button
                      type="button"
                      onClick={() => removeField(idx)}
                      className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                      title="Remove Field"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">Field Label / Question</label>
                    <input
                      className="input-field text-xs py-1.5"
                      placeholder="e.g. Cake Flavour, Patient Name"
                      value={field.label}
                      onChange={e => updateField(idx, { label: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">Field Key (Identifier)</label>
                    <input
                      className="input-field text-xs py-1.5 font-mono"
                      placeholder="e.g. flavour, patient_name"
                      value={field.key}
                      onChange={e => updateField(idx, { key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">Data Type</label>
                    <select
                      className="input-field text-xs py-1.5"
                      value={field.type}
                      onChange={e => updateField(idx, { type: e.target.value as WorkflowField['type'] })}
                    >
                      <option value="text">Text (String)</option>
                      <option value="number">Number (e.g. kg, quantity)</option>
                      <option value="date">Date</option>
                      <option value="time">Time</option>
                      <option value="select">Dropdown / Select</option>
                      <option value="boolean">Yes / No (Boolean)</option>
                    </select>
                  </div>
                </div>

                {field.type === 'select' && (
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">Options (comma separated)</label>
                    <input
                      className="input-field text-xs py-1.5"
                      placeholder="e.g. Custom Cake, Wedding Cake, Birthday Cake"
                      value={field.options?.join(', ') || ''}
                      onChange={e => updateField(idx, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 4: Conditional Logic & Branching */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <GitBranch size={13} /> 4. Conditional Branches & Priority Rules
              </label>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Example: If order required within 24h → mark as urgent. Otherwise normal follow-up.
              </p>
            </div>
            <button
              type="button"
              onClick={addCondition}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <Plus size={12} /> Add Condition
            </button>
          </div>

          <div className="space-y-2.5">
            {conditions.length === 0 ? (
              <p className="text-xs text-zinc-500 italic p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                No conditional rules defined. All calls will use default priority.
              </p>
            ) : (
              conditions.map((cond, idx) => (
                <div
                  key={cond.id || idx}
                  className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white flex items-center gap-1.5 text-xs">
                      Rule #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCondition(idx)}
                      className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                      title="Remove Condition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">If Field</label>
                      <select
                        className="input-field text-xs py-1.5"
                        value={cond.field}
                        onChange={e => updateCondition(idx, { field: e.target.value })}
                      >
                        {fields.map(f => (
                          <option key={f.key} value={f.key}>{f.label} ({f.key})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">Condition</label>
                      <select
                        className="input-field text-xs py-1.5"
                        value={cond.operator}
                        onChange={e => updateCondition(idx, { operator: e.target.value as any })}
                      >
                        <option value="equals">Equals</option>
                        <option value="contains">Contains</option>
                        <option value="less_than">Less Than (&lt; 24h)</option>
                        <option value="greater_than">Greater Than</option>
                        <option value="not_equals">Does Not Equal</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">Value to Match</label>
                      <input
                        className="input-field text-xs py-1.5"
                        placeholder="e.g. 24, Emergency, New Appointment"
                        value={cond.value}
                        onChange={e => updateCondition(idx, { value: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">Action to Trigger</label>
                      <select
                        className="input-field text-xs py-1.5"
                        value={cond.action}
                        onChange={e => updateCondition(idx, { action: e.target.value as any })}
                      >
                        <option value="mark_urgent">Mark as Urgent Priority</option>
                        <option value="create_calendar_event">Book Google Calendar Event</option>
                        <option value="send_notification">Send Owner SMS / Alert</option>
                        <option value="create_callback">Create Callback Task</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Step 5: Post-Call Action & Google Calendar Integration */}
        <div className="glass-card p-5 space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400">
            5. Action After Collection & External Tool Integrations
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Primary Post-Collection Action
              </label>
              <select
                className="input-field"
                value={postAction}
                onChange={e => setPostAction(e.target.value)}
              >
                <option value="create_record">Save Call Record to Dashboard</option>
                <option value="create_calendar_event">Book Event in Google Calendar</option>
                <option value="send_notification">Send Instant SMS Notification</option>
                <option value="create_callback">Create Priority Callback Task</option>
              </select>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <Calendar size={13} className="text-emerald-400" />
                  Google Calendar Agent Tool
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Allows Voice AI to check availability and book calendar slots during calls.
                </p>
              </div>
              <input
                type="checkbox"
                checked={calendarEnabled}
                onChange={e => setCalendarEnabled(e.target.checked)}
                className="rounded border-zinc-700 text-emerald-500 w-4 h-4 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Step 6: Closing Message */}
        <div className="glass-card p-5 space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400">
            6. Closing Message
          </label>
          <textarea
            id="workflow-closing"
            className="input-field text-xs leading-relaxed"
            rows={2}
            value={closingMessage}
            onChange={e => setClosingMessage(e.target.value)}
            placeholder="Thank you! We've received your details and our team will get back to you shortly."
            required
          />
        </div>

        {/* Submit & Status Bar */}
        <div className="flex items-center justify-between pt-2">
          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="rounded border-zinc-700 text-emerald-500"
            />
            Activate this workflow immediately for incoming missed calls
          </label>

          <div className="flex items-center gap-3">
            <Link href="/workflows" className="btn-secondary text-xs">Cancel</Link>
            <button
              id="save-workflow-btn"
              type="submit"
              disabled={saving || !name.trim() || !businessId}
              className="btn-primary text-xs py-2 px-5"
            >
              {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : <CheckCircle2 size={14} className="mr-1" />}
              {saving ? 'Saving...' : (isNew ? 'Create & Launch Workflow' : 'Save Changes')}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default function WorkflowFormPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-500">Loading Workflow Builder...</div>}>
      <WorkflowFormContent />
    </Suspense>
  )
}
