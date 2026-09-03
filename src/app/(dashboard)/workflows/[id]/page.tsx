'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { getUser } from '@/lib/demo-auth'
import { localDB, Business, Workflow, WorkflowStep } from '@/lib/local-db'
import toast from 'react-hot-toast'
import { ArrowLeft, Plus, Trash2, Loader2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const USE_CASES = [
  { key: 'missed_call_follow_up', label: 'Missed Call Follow-Up', description: 'Collect info when a customer calls back after a missed call' },
  { key: 'appointment_booking', label: 'Appointment Booking', description: 'Book appointments and add to calendar automatically' },
  { key: 'order_status', label: 'Order Status Lookup', description: 'Look up delivery or order status in real-time' },
  { key: 'lead_qualification', label: 'Lead Qualification', description: 'Qualify inbound sales leads and collect requirements' },
  { key: 'service_request', label: 'Service Request', description: 'Handle maintenance or repair service requests' },
  { key: 'general_enquiry', label: 'General Enquiry', description: 'Handle general customer enquiries and FAQs' },
]

const FOLLOW_UP_ACTIONS = [
  { key: 'calendar', label: '📅 Book Google Calendar Event' },
  { key: 'sms', label: '💬 Send SMS Follow-Up' },
  { key: 'email', label: '📧 Send Email Summary' },
  { key: 'none', label: '📋 Save Record Only' },
]

const STEP_TEMPLATES: Record<string, WorkflowStep[]> = {
  missed_call_follow_up: [
    { id: 's1', type: 'collect', label: 'Customer Name', prompt: 'May I have your name please?', field: 'name' },
    { id: 's2', type: 'collect', label: 'Purpose of Call', prompt: 'What were you calling about?', field: 'purpose' },
    { id: 's3', type: 'collect', label: 'Callback Number', prompt: 'What number should we call you back on?', field: 'callback_phone' },
    { id: 's4', type: 'end', label: 'Confirm', prompt: "Thank you! We'll call you back shortly." },
  ],
  appointment_booking: [
    { id: 's1', type: 'collect', label: 'Patient / Customer Name', prompt: 'What is your name?', field: 'name' },
    { id: 's2', type: 'collect', label: 'Reason for Visit', prompt: 'What is the reason for your visit?', field: 'reason' },
    { id: 's3', type: 'collect', label: 'Preferred Date & Time', prompt: 'What date and time works best for you?', field: 'preferred_datetime' },
    { id: 's4', type: 'action', label: 'Book Calendar Event', prompt: 'Booking your appointment in the calendar' },
    { id: 's5', type: 'end', label: 'Confirm', prompt: 'Your appointment is confirmed! We will see you then.' },
  ],
  order_status: [
    { id: 's1', type: 'collect', label: 'Order Number', prompt: 'Please provide your order or tracking number.', field: 'order_id' },
    { id: 's2', type: 'action', label: 'Look Up Order', prompt: 'Looking up your order status' },
    { id: 's3', type: 'end', label: 'Status Report', prompt: 'Your order status has been found and shared.' },
  ],
  lead_qualification: [
    { id: 's1', type: 'collect', label: 'Contact Name', prompt: 'May I have your name?', field: 'name' },
    { id: 's2', type: 'collect', label: 'Interest Area', prompt: 'What are you looking for?', field: 'interest' },
    { id: 's3', type: 'collect', label: 'Budget Range', prompt: 'What is your approximate budget?', field: 'budget' },
    { id: 's4', type: 'collect', label: 'Timeline', prompt: 'What is your timeline for this?', field: 'timeline' },
    { id: 's5', type: 'end', label: 'Confirm', prompt: "Thank you! Our team will reach out to you with options." },
  ],
  service_request: [
    { id: 's1', type: 'collect', label: 'Customer Name', prompt: 'May I have your name?', field: 'name' },
    { id: 's2', type: 'collect', label: 'Service Needed', prompt: 'What service do you need?', field: 'service_type' },
    { id: 's3', type: 'collect', label: 'Issue Description', prompt: 'Can you briefly describe the issue?', field: 'description' },
    { id: 's4', type: 'collect', label: 'Preferred Visit Time', prompt: 'When would you like us to visit?', field: 'visit_time' },
    { id: 's5', type: 'action', label: 'Schedule Visit', prompt: 'Scheduling your service visit' },
    { id: 's6', type: 'end', label: 'Confirm', prompt: "We've logged your request. Our team will confirm the visit time." },
  ],
  general_enquiry: [
    { id: 's1', type: 'collect', label: 'Your Name', prompt: 'May I have your name?', field: 'name' },
    { id: 's2', type: 'collect', label: 'Enquiry', prompt: 'How can we help you today?', field: 'enquiry' },
    { id: 's3', type: 'end', label: 'Confirm', prompt: "Thank you! We've noted your enquiry and will get back to you soon." },
  ],
}

function uid() { return 's' + Math.random().toString(36).slice(2, 8) }

function WorkflowFormContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const isNew = params?.id === 'new'
  const [userId, setUserId] = useState('')

  const [businesses, setBusinesses] = useState<Business[]>([])
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    businessId: searchParams?.get('business_id') || '',
    useCase: 'missed_call_follow_up',
    followUpAction: 'calendar',
    isActive: true,
    steps: STEP_TEMPLATES.missed_call_follow_up as WorkflowStep[],
  })

  useEffect(() => {
    const user = getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)

    const bizs = localDB.businesses.list(user.id)
    setBusinesses(bizs)

    if (!isNew && params?.id) {
      const wf = localDB.workflows.get(params.id as string)
      if (wf) {
        setForm({
          name: wf.name,
          businessId: wf.businessId,
          useCase: wf.useCase,
          followUpAction: wf.followUpAction,
          isActive: wf.isActive,
          steps: wf.steps || [],
        })
      } else {
        toast.error('Workflow not found')
        router.push('/workflows')
      }
    } else if (isNew && bizs.length > 0 && !searchParams?.get('business_id')) {
      setForm(f => ({ ...f, businessId: bizs[0].id }))
    }
  }, [isNew, params?.id, router, searchParams])

  const handleUseCaseChange = (key: string) => {
    const uc = USE_CASES.find(u => u.key === key)
    setForm(f => ({
      ...f,
      useCase: key,
      name: uc ? uc.label : f.name,
      steps: STEP_TEMPLATES[key] || STEP_TEMPLATES.general_enquiry,
    }))
  }

  const addStep = () => {
    const newStep: WorkflowStep = {
      id: uid(),
      type: 'collect',
      label: 'New Question',
      prompt: 'Please provide your answer.',
      field: 'field_' + uid(),
    }
    setForm(f => ({ ...f, steps: [...f.steps, newStep] }))
  }

  const updateStep = (idx: number, data: Partial<WorkflowStep>) => {
    setForm(f => {
      const steps = [...f.steps]
      steps[idx] = { ...steps[idx], ...data }
      return { ...f, steps }
    })
  }

  const removeStep = (idx: number) => {
    setForm(f => ({ ...f, steps: f.steps.filter((_, i) => i !== idx) }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.businessId) { toast.error('Please select a business'); return }
    if (!form.name.trim()) { toast.error('Workflow name is required'); return }
    setSaving(true)
    try {
      if (isNew) {
        localDB.workflows.create({ ...form, userId })
        toast.success('Workflow created!')
      } else {
        localDB.workflows.update(params?.id as string, form)
        toast.success('Workflow updated!')
      }
      router.push('/workflows')
    } catch {
      toast.error('Save failed. Please try again.')
    }
    setSaving(false)
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-5">
        <Link href="/workflows" className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            {isNew ? 'Create Workflow' : 'Edit Workflow'}
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure how your AI voice assistant handles missed calls for this business.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <div className="glass-card p-5 space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Basic Info
          </label>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Business <span className="text-emerald-400">*</span>
            </label>
            <select
              id="workflow-business"
              className="input-field"
              value={form.businessId}
              onChange={e => setForm(f => ({ ...f, businessId: e.target.value }))}
              required
            >
              <option value="">Select a business...</option>
              {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            {businesses.length === 0 && (
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                No businesses found. <Link href="/businesses/new" style={{ color: 'var(--green)' }}>Create one first →</Link>
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
              placeholder="e.g. Appointment Booking, Order Follow-Up..."
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
        </div>

        {/* Use Case */}
        <div className="glass-card p-5 space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Use Case
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {USE_CASES.map(uc => {
              const selected = form.useCase === uc.key
              return (
                <button
                  key={uc.key}
                  type="button"
                  id={`usecase-${uc.key}`}
                  onClick={() => handleUseCaseChange(uc.key)}
                  className={cn(
                    'p-3 rounded-lg text-left transition-all border text-xs',
                    selected
                      ? 'bg-emerald-500/10 border-emerald-500'
                      : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                  )}
                >
                  <div className="font-semibold text-white mb-1">{uc.label}</div>
                  <div className="text-zinc-400 text-[11px]">{uc.description}</div>
                  {selected && (
                    <div className="mt-1.5 text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                      <CheckCircle2 size={11} /> Selected
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Conversation Steps */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Conversation Steps
            </label>
            <button
              type="button"
              id="add-step-btn"
              onClick={addStep}
              className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
            >
              <Plus size={12} /> Add Step
            </button>
          </div>

          <div className="space-y-3">
            {form.steps.map((step, idx) => (
              <div
                key={step.id}
                className={cn('p-4 rounded-xl border text-xs space-y-2', {
                  'bg-emerald-500/5 border-emerald-500/30': step.type === 'end',
                  'bg-purple-500/5 border-purple-500/30': step.type === 'action',
                  'bg-blue-500/5 border-blue-500/30': step.type === 'collect',
                  'bg-zinc-900/50 border-zinc-800': step.type === 'confirm',
                })}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{idx + 1}. {step.label}</span>
                  <div className="flex items-center gap-2">
                    <select
                      className="input-field text-xs py-1"
                      style={{ width: 'auto', fontSize: '11px', padding: '4px 8px' }}
                      value={step.type}
                      onChange={e => updateStep(idx, { type: e.target.value as WorkflowStep['type'] })}
                    >
                      <option value="collect">Collect Info</option>
                      <option value="action">Execute Tool</option>
                      <option value="confirm">Confirm</option>
                      <option value="end">End Call</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeStep(idx)}
                      className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <input
                  className="input-field text-xs"
                  placeholder="Step label (e.g. 'Customer Name')"
                  value={step.label}
                  onChange={e => updateStep(idx, { label: e.target.value })}
                />
                <input
                  className="input-field text-xs"
                  placeholder="What the AI says (prompt)"
                  value={step.prompt || ''}
                  onChange={e => updateStep(idx, { prompt: e.target.value })}
                />
                {step.type === 'collect' && (
                  <input
                    className="input-field text-xs"
                    placeholder="Field name (e.g. 'customer_name')"
                    value={step.field || ''}
                    onChange={e => updateStep(idx, { field: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Follow-Up Action */}
        <div className="glass-card p-5 space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400">
            After Call Action
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {FOLLOW_UP_ACTIONS.map(action => {
              const selected = form.followUpAction === action.key
              return (
                <button
                  key={action.key}
                  type="button"
                  id={`action-${action.key}`}
                  onClick={() => setForm(f => ({ ...f, followUpAction: action.key }))}
                  className={cn(
                    'p-3 rounded-lg text-left transition-all border text-sm',
                    selected
                      ? 'bg-emerald-500/10 border-emerald-500 text-white'
                      : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  )}
                >
                  {action.label}
                  {selected && <CheckCircle2 size={12} className="inline ml-2 text-emerald-400" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
              className="rounded border-zinc-700"
            />
            Activate workflow immediately
          </label>
          <div className="flex items-center gap-3">
            <Link href="/workflows" className="btn-secondary text-xs">Cancel</Link>
            <button
              id="save-workflow-btn"
              type="submit"
              disabled={saving || !form.name.trim() || !form.businessId}
              className="btn-primary text-xs py-2 px-4"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Saving...' : (isNew ? 'Create Workflow' : 'Save Changes')}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default function WorkflowFormPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-500">Loading...</div>}>
      <WorkflowFormContent />
    </Suspense>
  )
}
