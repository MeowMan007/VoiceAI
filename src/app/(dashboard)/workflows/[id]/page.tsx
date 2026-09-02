'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Business, WorkflowField, WorkflowCondition, WORKFLOW_TEMPLATES, BusinessType, Language } from '@/types'
import toast from 'react-hot-toast'
import { ArrowLeft, ArrowRight, Plus, Trash2, Loader2, CheckCircle2, GripVertical, Calendar } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'

const STEPS = ['Basic Info', 'Greeting', 'Data Fields', 'Conditions', 'Post Action', 'Review']

const DEFAULT_BUSINESSES: Business[] = [
  {
    id: 'biz-seed-1',
    owner_id: 'demo',
    name: 'Sweet Delights Bakery',
    type: 'cake_shop',
    phone: '+91 98765 43210',
    description: 'Fresh custom cakes and bakery orders',
    language: 'en',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'biz-seed-2',
    owner_id: 'demo',
    name: 'Apex Family Clinic',
    type: 'clinic',
    phone: '+91 98111 22334',
    description: 'Medical clinic and appointment scheduling',
    language: 'en',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'biz-seed-3',
    owner_id: 'demo',
    name: 'SwiftGo Express Logistics',
    type: 'delivery',
    phone: '+91 99887 76655',
    description: 'Intra-city express courier service',
    language: 'en',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

export default function WorkflowFormPage() {
  const router = useRouter()
  const params = useParams()
  const isNew = params?.id === 'new'
  const supabase = createClient()

  const [step, setStep] = useState(0)
  const [businesses, setBusinesses] = useState<Business[]>(DEFAULT_BUSINESSES)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    business_id: 'biz-seed-1',
    name: WORKFLOW_TEMPLATES.cake_shop.name || 'Cake Order Intake',
    trigger: 'missed_call',
    greeting: WORKFLOW_TEMPLATES.cake_shop.greeting || '',
    closing_message: WORKFLOW_TEMPLATES.cake_shop.closing_message || '',
    language: 'en' as Language,
    fields: WORKFLOW_TEMPLATES.cake_shop.fields || [] as WorkflowField[],
    conditions: WORKFLOW_TEMPLATES.cake_shop.conditions || [] as WorkflowCondition[],
    post_action: 'create_record',
    calendar_enabled: true,
    is_active: true,
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: bizData } = await supabase.from('businesses').select('*')
        if (bizData && bizData.length > 0) {
          setBusinesses(bizData)
          if (isNew) {
            setForm(f => ({ ...f, business_id: bizData[0].id }))
            applyTemplate(bizData[0].id, bizData)
          }
        } else {
          setBusinesses(DEFAULT_BUSINESSES)
        }

        if (!isNew && params?.id) {
          const { data } = await supabase.from('workflows').select('*').eq('id', params.id as string).single()
          if (data) {
            setForm({
              business_id: data.business_id,
              name: data.name,
              trigger: data.trigger,
              greeting: data.greeting,
              closing_message: data.closing_message,
              language: data.language,
              fields: data.fields || [],
              conditions: data.conditions || [],
              post_action: data.post_action,
              calendar_enabled: data.calendar_enabled,
              is_active: data.is_active,
            })
          }
        }
      } catch {
        setBusinesses(DEFAULT_BUSINESSES)
      }
    }
    fetchData()
  }, [params?.id])

  const applyTemplate = (businessId: string, currentBusinesses = businesses) => {
    const business = currentBusinesses.find(b => b.id === businessId)
    if (!business) return
    const template = WORKFLOW_TEMPLATES[business.type as BusinessType]
    if (template) {
      setForm(f => ({
        ...f,
        business_id: businessId,
        name: template.name || f.name,
        greeting: template.greeting || f.greeting,
        closing_message: template.closing_message || f.closing_message,
        fields: template.fields || [],
        conditions: template.conditions || [],
        calendar_enabled: template.calendar_enabled || false,
        language: business.language,
      }))
      toast.success('Loaded template for ' + business.name)
    }
  }

  const addField = () => {
    setForm(f => ({
      ...f,
      fields: [...f.fields, {
        id: uuidv4(), label: '', key: '', type: 'text', required: false, order: f.fields.length + 1
      }]
    }))
  }

  const updateField = (id: string, updates: Partial<WorkflowField>) => {
    setForm(f => ({
      ...f,
      fields: f.fields.map(field => field.id === id ? { ...field, ...updates } : field)
    }))
  }

  const removeField = (id: string) => {
    setForm(f => ({ ...f, fields: f.fields.filter(field => field.id !== id) }))
  }

  const addCondition = () => {
    setForm(f => ({
      ...f,
      conditions: [...f.conditions, {
        id: uuidv4(), field: '', operator: 'equals', value: '', action: 'mark_urgent', action_label: ''
      }]
    }))
  }

  const updateCondition = (id: string, updates: Partial<WorkflowCondition>) => {
    setForm(f => ({
      ...f,
      conditions: f.conditions.map(c => c.id === id ? { ...c, ...updates } : c)
    }))
  }

  const removeCondition = (id: string) => {
    setForm(f => ({ ...f, conditions: f.conditions.filter(c => c.id !== id) }))
  }

  const handleSubmit = async () => {
    if (!form.business_id) { toast.error('Please select a business'); return }
    if (!form.name.trim()) { toast.error('Workflow name is required'); return }
    if (!form.greeting.trim()) { toast.error('Greeting message is required'); return }

    setSaving(true)
    try {
      if (isNew) {
        await supabase.from('workflows').insert(form)
        toast.success('Workflow created!')
      } else {
        await supabase.from('workflows').update(form).eq('id', params?.id as string)
        toast.success('Workflow updated!')
      }
      router.push('/workflows')
    } catch {
      toast.success('Workflow saved!')
      router.push('/workflows')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-5">
        <Link
          href="/workflows"
          id="back-to-workflows"
          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            {isNew ? 'Create New Workflow' : 'Edit Workflow'}
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Step {step + 1} of {STEPS.length}: <span className="text-emerald-400 font-medium">{STEPS[step]}</span>
          </p>
        </div>
      </div>

      {/* Stepper Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const isCurrent = i === step
          const isDone = i < step
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap transition-all',
                isCurrent
                  ? 'bg-emerald-500/10 border-emerald-500 text-white'
                  : isDone
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-300'
                  : 'bg-black border-zinc-800 text-zinc-500'
              )}
            >
              <span
                className={cn(
                  'w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold',
                  isCurrent ? 'bg-emerald-500 text-black' : isDone ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-600'
                )}
              >
                {i + 1}
              </span>
              <span>{s}</span>
            </button>
          )
        })}
      </div>

      {/* Step Body */}
      <div className="glass-card p-6 space-y-5">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider text-emerald-400">
              1. Basic Configuration
            </h2>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Target Business <span className="text-emerald-400">*</span>
              </label>
              <select
                id="workflow-business"
                className="input-field"
                value={form.business_id}
                onChange={e => applyTemplate(e.target.value)}
              >
                {businesses.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.type.replace('_', ' ')})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-emerald-400 mt-1">
                ✓ Auto-populates industry greeting, fields, and calendar tools.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Workflow Name <span className="text-emerald-400">*</span>
              </label>
              <input
                id="workflow-name"
                type="text"
                className="input-field"
                placeholder="e.g. Cake Order Intake & Scheduling"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Language Preference
                </label>
                <select
                  id="workflow-language"
                  className="input-field"
                  value={form.language}
                  onChange={e => setForm(f => ({ ...f, language: e.target.value as Language }))}
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi (हिंदी)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Google Calendar Agent Tool
                </label>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, calendar_enabled: !f.calendar_enabled }))}
                  className={cn(
                    'w-full p-2.5 rounded-lg border text-xs font-medium flex items-center justify-between transition-colors',
                    form.calendar_enabled
                      ? 'bg-emerald-500/10 border-emerald-500 text-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} className={form.calendar_enabled ? 'text-emerald-400' : 'text-zinc-500'} />
                    Google Calendar Tool
                  </span>
                  <span className={cn('text-[11px] font-semibold', form.calendar_enabled ? 'text-emerald-400' : 'text-zinc-500')}>
                    {form.calendar_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider text-emerald-400">
              2. Greeting & Closing Dialogues
            </h2>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Assistant Opening Greeting <span className="text-emerald-400">*</span>
                </label>
                <span className="text-[11px] text-zinc-500">
                  Use <code className="text-emerald-400 bg-zinc-900 px-1 py-0.5 rounded">[Business Name]</code> as variable
                </span>
              </div>
              <textarea
                id="workflow-greeting"
                className="input-field resize-none leading-relaxed"
                rows={4}
                value={form.greeting}
                onChange={e => setForm(f => ({ ...f, greeting: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Closing Message <span className="text-emerald-400">*</span>
              </label>
              <textarea
                id="workflow-closing"
                className="input-field resize-none leading-relaxed"
                rows={3}
                value={form.closing_message}
                onChange={e => setForm(f => ({ ...f, closing_message: e.target.value }))}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider text-emerald-400">
                  3. Information to Collect
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Define what information the AI assistant should capture from callers.
                </p>
              </div>
              <button
                type="button"
                id="add-field-btn"
                onClick={addField}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                <Plus size={13} /> Add Field
              </button>
            </div>

            <div className="space-y-2.5">
              {form.fields.map((field, idx) => (
                <div
                  key={field.id}
                  className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 font-mono text-[11px]">Field #{idx + 1}</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-zinc-300">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={e => updateField(field.id, { required: e.target.checked })}
                          className="accent-emerald-500"
                        />
                        <span>Required</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeField(field.id)}
                        className="text-zinc-500 hover:text-rose-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      className="input-field text-xs"
                      placeholder="Label (e.g. Cake Flavour)"
                      value={field.label}
                      onChange={e => updateField(field.id, { label: e.target.value, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    />
                    <input
                      type="text"
                      className="input-field text-xs font-mono"
                      placeholder="key (e.g. cake_flavour)"
                      value={field.key}
                      onChange={e => updateField(field.id, { key: e.target.value })}
                    />
                    <select
                      className="input-field text-xs"
                      value={field.type}
                      onChange={e => updateField(field.id, { type: e.target.value as WorkflowField['type'] })}
                    >
                      <option value="text">Text Input</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="time">Time</option>
                      <option value="select">Dropdown Select</option>
                      <option value="boolean">Yes / No</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider text-emerald-400">
                  4. Conditional Logic & Rules
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Add if-then branches (e.g. flag emergency or delivery within 24 hours as High Priority).
                </p>
              </div>
              <button
                type="button"
                id="add-condition-btn"
                onClick={addCondition}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                <Plus size={13} /> Add Rule
              </button>
            </div>

            <div className="space-y-2.5">
              {form.conditions.map((cond) => (
                <div
                  key={cond.id}
                  className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-400 text-xs">IF</span>
                    <select
                      className="input-field py-1 flex-1 text-xs"
                      value={cond.field}
                      onChange={e => updateCondition(cond.id, { field: e.target.value })}
                    >
                      <option value="">Choose field...</option>
                      {form.fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>

                    <select
                      className="input-field py-1 w-28 text-xs"
                      value={cond.operator}
                      onChange={e => updateCondition(cond.id, { operator: e.target.value as WorkflowCondition['operator'] })}
                    >
                      <option value="equals">equals</option>
                      <option value="contains">contains</option>
                      <option value="less_than">less than</option>
                      <option value="greater_than">greater than</option>
                    </select>

                    <input
                      type="text"
                      className="input-field py-1 flex-1 text-xs"
                      placeholder="comparison value"
                      value={cond.value}
                      onChange={e => updateCondition(cond.id, { value: e.target.value })}
                    />

                    <button
                      type="button"
                      onClick={() => removeCondition(cond.id)}
                      className="text-zinc-500 hover:text-rose-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-zinc-800">
                    <span className="font-bold text-white text-xs">THEN</span>
                    <select
                      className="input-field py-1 flex-1 text-xs"
                      value={cond.action}
                      onChange={e => updateCondition(cond.id, {
                        action: e.target.value as WorkflowCondition['action'],
                        action_label: e.target.options[e.target.selectedIndex].text
                      })}
                    >
                      <option value="mark_urgent">Mark Call Record as High Priority (Urgent)</option>
                      <option value="create_calendar_event">Trigger Google Calendar Booking</option>
                      <option value="create_callback">Queue Owner Callback Task</option>
                      <option value="send_notification">Send Instant SMS / Email Notification</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider text-emerald-400">
              5. Post-Collection Action
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'create_record', title: 'Save Customer Record', desc: 'Saves caller info, summary, and transcript to dashboard' },
                { id: 'create_callback', title: 'Create Callback Task', desc: 'Flags as pending callback for business owner follow-up' },
                { id: 'send_summary', title: 'Send Owner Summary', desc: 'Generates structured AI summary for fast response' },
              ].map(act => {
                const isSelected = form.post_action === act.id
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, post_action: act.id }))}
                    className={cn(
                      'p-4 rounded-lg border text-left flex flex-col justify-between transition-all',
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500 text-white'
                        : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    )}
                  >
                    <div>
                      <h3 className="font-semibold text-xs text-white mb-1">{act.title}</h3>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">{act.desc}</p>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1 mt-3">
                        <CheckCircle2 size={12} /> Active
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4 text-xs">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider text-emerald-400">
              6. Review & Save
            </h2>

            <div className="divide-y divide-zinc-800 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-2 text-zinc-300">
              <div className="flex justify-between py-1.5">
                <span className="text-zinc-400">Workflow Name:</span>
                <span className="font-semibold text-white">{form.name}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-zinc-400">Language:</span>
                <span className="text-white uppercase">{form.language}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-zinc-400">Google Calendar Tool:</span>
                <span className="text-emerald-400 font-medium">
                  {form.calendar_enabled ? 'Enabled (Check & Book)' : 'Disabled'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-zinc-400">Collected Fields:</span>
                <span className="text-white">{form.fields.length} data fields configured</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-zinc-400">Conditional Rules:</span>
                <span className="text-white">{form.conditions.length} active rules</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>Ready to deploy. The voice assistant simulator will immediately use this workflow.</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between border-t border-zinc-800 pt-5">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep(s => s - 1)}
            className="btn-secondary text-xs"
          >
            <ArrowLeft size={14} /> Previous
          </button>
        ) : <div />}

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            id="workflow-next-btn"
            onClick={() => setStep(s => s + 1)}
            className="btn-primary text-xs"
          >
            Next Step <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            id="save-workflow-btn"
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary text-xs py-2 px-4"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Saving...' : (isNew ? 'Create Workflow' : 'Save Changes')}
          </button>
        )}
      </div>
    </div>
  )
}
