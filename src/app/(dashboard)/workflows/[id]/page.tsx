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

export default function WorkflowFormPage() {
  const router = useRouter()
  const params = useParams()
  const isNew = params?.id === 'new'
  const supabase = createClient()

  const [step, setStep] = useState(0)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!isNew)

  const [form, setForm] = useState({
    business_id: '',
    name: '',
    trigger: 'missed_call',
    greeting: '',
    closing_message: '',
    language: 'en' as Language,
    fields: [] as WorkflowField[],
    conditions: [] as WorkflowCondition[],
    post_action: 'create_record',
    calendar_enabled: false,
    is_active: true,
  })

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: bizData } = await supabase.from('businesses').select('*').eq('owner_id', user.id)
      setBusinesses(bizData || [])
      if (bizData?.length && isNew) {
        setForm(f => ({ ...f, business_id: bizData[0].id }))
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
        setLoading(false)
      }
    }
    fetchData()
  }, [params?.id])

  const applyTemplate = (businessId: string) => {
    const business = businesses.find(b => b.id === businessId)
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
      toast.success('Template loaded for ' + business.type.replace('_', ' '))
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
    if (!form.business_id) { toast.error('Select a business'); return }
    if (!form.name) { toast.error('Workflow name is required'); return }
    if (!form.greeting) { toast.error('Greeting message is required'); return }

    setSaving(true)
    if (isNew) {
      const { error } = await supabase.from('workflows').insert(form)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Workflow created!')
    } else {
      const { error } = await supabase.from('workflows').update(form).eq('id', params?.id as string)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Workflow updated!')
    }
    router.push('/workflows')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/workflows" id="back-to-workflows" className="p-2 rounded-lg btn-secondary">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold font-display">{isNew ? 'New Workflow' : 'Edit Workflow'}</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </p>
        </div>
      </div>

      {/* Step Progress */}
      <div className="flex gap-2 mb-6">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => setStep(i)}
            className={cn('flex-1 h-1.5 rounded-full transition-all', i <= step ? 'bg-purple-500' : 'bg-white/10')}
          />
        ))}
      </div>

      {/* Step Content */}
      <div className="glass-card p-6 mb-4 animate-fade-in">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold mb-4">Basic Information</h2>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Select Business *
              </label>
              <select id="workflow-business" className="input-field"
                value={form.business_id}
                onChange={e => applyTemplate(e.target.value)}>
                <option value="">Choose a business...</option>
                {businesses.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              {form.business_id && (
                <p className="text-xs mt-1" style={{ color: 'var(--accent-purple)' }}>
                  ✨ Template auto-loaded for this business type
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Workflow Name *
              </label>
              <input id="workflow-name" type="text" className="input-field"
                placeholder="e.g. Cake Order Intake"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Trigger
              </label>
              <div className="p-3 rounded-xl flex items-center gap-3"
                style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)' }}>
                <span className="text-lg">📞</span>
                <div>
                  <p className="text-sm font-medium">Missed Call</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Triggered when a customer&apos;s call is missed
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Language
                </label>
                <select id="workflow-language" className="input-field"
                  value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value as Language }))}>
                  <option value="en">English</option>
                  <option value="hi">Hindi (हिंदी)</option>
                </select>
              </div>
              <div className="flex items-end pb-0.5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className={cn('w-10 h-5 rounded-full relative transition-colors',
                    form.calendar_enabled ? 'bg-purple-500' : 'bg-white/10')}
                    onClick={() => setForm(f => ({ ...f, calendar_enabled: !f.calendar_enabled }))}>
                    <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
                      form.calendar_enabled ? 'left-5' : 'left-0.5')} />
                  </div>
                  <div>
                    <Calendar size={14} className="inline mr-1" style={{ color: form.calendar_enabled ? 'var(--accent-purple)' : 'var(--text-muted)' }} />
                    <span className="text-sm">Google Calendar</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold mb-4">Greeting & Closing Messages</h2>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Opening Greeting *
                <span className="ml-2 text-purple-400">Use [Business Name] as a variable</span>
              </label>
              <textarea id="workflow-greeting" className="input-field resize-none" rows={4}
                placeholder="Hi! Thanks for calling [Business Name]. Sorry we missed your call..."
                value={form.greeting} onChange={e => setForm(f => ({ ...f, greeting: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Closing Message *
              </label>
              <textarea id="workflow-closing" className="input-field resize-none" rows={3}
                placeholder="Thank you! We'll get back to you shortly..."
                value={form.closing_message} onChange={e => setForm(f => ({ ...f, closing_message: e.target.value }))} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Data Fields to Collect</h2>
              <button id="add-field-btn" onClick={addField} className="btn-secondary flex items-center gap-2 text-sm py-2 px-3">
                <Plus size={14} /> Add Field
              </button>
            </div>
            {form.fields.length === 0 ? (
              <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
                No fields yet. Add fields to collect from customers.
              </div>
            ) : (
              <div className="space-y-3">
                {form.fields.map((field, idx) => (
                  <div key={field.id} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <GripVertical size={14} style={{ color: 'var(--text-muted)' }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Field {idx + 1}</span>
                      <label className="ml-auto flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={field.required}
                          onChange={e => updateField(field.id, { required: e.target.checked })}
                          className="accent-purple-500" />
                        <span className="text-xs">Required</span>
                      </label>
                      <button onClick={() => removeField(field.id)} className="p-1 rounded"
                        style={{ color: '#ef4444' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input type="text" className="input-field text-xs py-2"
                        placeholder="Label (e.g. Cake Type)"
                        value={field.label}
                        onChange={e => updateField(field.id, { label: e.target.value, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })} />
                      <input type="text" className="input-field text-xs py-2"
                        placeholder="Key (e.g. cake_type)"
                        value={field.key}
                        onChange={e => updateField(field.id, { key: e.target.value })} />
                      <select className="input-field text-xs py-2"
                        value={field.type}
                        onChange={e => updateField(field.id, { type: e.target.value as WorkflowField['type'] })}>
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="time">Time</option>
                        <option value="select">Select</option>
                        <option value="boolean">Yes/No</option>
                      </select>
                    </div>
                    {field.type === 'select' && (
                      <input type="text" className="input-field text-xs py-2 mt-2"
                        placeholder="Options: comma,separated,values"
                        value={field.options?.join(',') || ''}
                        onChange={e => updateField(field.id, { options: e.target.value.split(',').map(s => s.trim()) })} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold">Conditional Logic</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Set rules to trigger actions based on collected data
                </p>
              </div>
              <button id="add-condition-btn" onClick={addCondition}
                className="btn-secondary flex items-center gap-2 text-sm py-2 px-3">
                <Plus size={14} /> Add Rule
              </button>
            </div>
            {form.conditions.length === 0 ? (
              <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
                No conditions yet. Add rules like &quot;If urgency = Emergency → mark as urgent&quot;
              </div>
            ) : (
              <div className="space-y-3">
                {form.conditions.map((condition) => (
                  <div key={condition.id} className="p-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold" style={{ color: 'var(--accent-purple)' }}>IF</span>
                      <select className="input-field text-xs py-1.5 flex-1"
                        value={condition.field}
                        onChange={e => updateCondition(condition.id, { field: e.target.value })}>
                        <option value="">Select field...</option>
                        {form.fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                      </select>
                      <select className="input-field text-xs py-1.5 w-32"
                        value={condition.operator}
                        onChange={e => updateCondition(condition.id, { operator: e.target.value as WorkflowCondition['operator'] })}>
                        <option value="equals">equals</option>
                        <option value="contains">contains</option>
                        <option value="not_equals">not equals</option>
                        <option value="greater_than">greater than</option>
                        <option value="less_than">less than</option>
                      </select>
                      <input type="text" className="input-field text-xs py-1.5 flex-1"
                        placeholder="value"
                        value={condition.value}
                        onChange={e => updateCondition(condition.id, { value: e.target.value })} />
                      <button onClick={() => removeCondition(condition.id)}
                        style={{ color: '#ef4444' }}><Trash2 size={12} /></button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: 'var(--accent-green)' }}>THEN</span>
                      <select className="input-field text-xs py-1.5 flex-1"
                        value={condition.action}
                        onChange={e => updateCondition(condition.id, { action: e.target.value as WorkflowCondition['action'] })}>
                        <option value="mark_urgent">Mark as Urgent</option>
                        <option value="create_calendar_event">Create Calendar Event</option>
                        <option value="send_notification">Send Notification</option>
                        <option value="create_callback">Create Callback Task</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-semibold mb-4">Post-Collection Action</h2>
            {[
              { value: 'create_record', label: 'Create Customer Record', desc: 'Save collected data to your dashboard', icon: '📋' },
              { value: 'create_callback', label: 'Create Callback Task', desc: 'Add to callback task list for follow-up', icon: '📞' },
              { value: 'send_summary', label: 'Send Owner Summary', desc: 'Notify business owner with a summary', icon: '📧' },
            ].map(opt => (
              <button key={opt.value} type="button" id={`post-action-${opt.value}`}
                onClick={() => setForm(f => ({ ...f, post_action: opt.value }))}
                className="w-full p-4 rounded-xl text-left flex items-center gap-3 transition-all"
                style={{
                  background: form.post_action === opt.value ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${form.post_action === opt.value ? 'rgba(139,92,246,0.5)' : 'var(--border)'}`,
                }}>
                <span className="text-2xl">{opt.icon}</span>
                <div className="flex-1">
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{opt.desc}</p>
                </div>
                {form.post_action === opt.value && <CheckCircle2 size={18} style={{ color: 'var(--accent-purple)' }} />}
              </button>
            ))}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="font-semibold mb-4">Review & Save</h2>
            {[
              { label: 'Business', value: businesses.find(b => b.id === form.business_id)?.name || '—' },
              { label: 'Workflow Name', value: form.name || '—' },
              { label: 'Language', value: form.language === 'hi' ? 'Hindi' : 'English' },
              { label: 'Fields', value: `${form.fields.length} fields (${form.fields.filter(f => f.required).length} required)` },
              { label: 'Conditions', value: `${form.conditions.length} rules` },
              { label: 'Calendar', value: form.calendar_enabled ? 'Enabled ✅' : 'Disabled' },
              { label: 'Post Action', value: form.post_action.replace('_', ' ') },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2"
                style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                <span className="text-sm font-medium">{item.value}</span>
              </div>
            ))}
            <div className="mt-2 p-3 rounded-xl"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <p className="text-sm" style={{ color: '#34d399' }}>
                ✅ Your workflow is ready to be saved. It will be active and usable in the simulator.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} className="btn-secondary flex items-center gap-2">
            <ArrowLeft size={16} /> Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button id="workflow-next-btn" onClick={() => setStep(s => s + 1)}
            className="btn-primary flex items-center gap-2 ml-auto">
            Next <ArrowRight size={16} />
          </button>
        ) : (
          <button id="save-workflow-btn" onClick={handleSubmit} disabled={saving}
            className="btn-primary flex items-center gap-2 ml-auto">
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Saving...' : (isNew ? 'Create Workflow' : 'Save Changes')}
          </button>
        )}
      </div>
    </div>
  )
}
