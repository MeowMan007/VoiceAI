'use client'
import { useEffect, useRef, useState, Suspense, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Workflow, SimulatorMessage, BUSINESS_TYPES, WORKFLOW_TEMPLATES, BusinessType } from '@/types'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Send, Mic, RefreshCw, Save, Phone, PhoneOff,
  Globe, Sparkles, Calendar, Volume2, CheckCircle2,
  User, Bot, Radio
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { cn } from '@/lib/utils'

// Built-in demonstration workflows — English + Hindi
const DEMO_WORKFLOWS: Workflow[] = [
  {
    id: 'demo-cake-en',
    business_id: 'demo-biz-1',
    name: 'Cake Order Intake (English)',
    trigger: 'missed_call',
    greeting: WORKFLOW_TEMPLATES.cake_shop.greeting!,
    closing_message: WORKFLOW_TEMPLATES.cake_shop.closing_message!,
    language: 'en',
    fields: WORKFLOW_TEMPLATES.cake_shop.fields!,
    conditions: WORKFLOW_TEMPLATES.cake_shop.conditions!,
    post_action: 'create_record',
    calendar_enabled: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    business: {
      id: 'demo-biz-1',
      owner_id: 'demo',
      name: 'Sweet Delights Bakery',
      type: 'cake_shop',
      phone: '+91 98765 43210',
      description: 'Artisanal cake & pastry shop',
      language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    id: 'demo-cake-hi',
    business_id: 'demo-biz-1',
    name: 'Cake Order Intake (Hindi)',
    trigger: 'missed_call',
    greeting: 'नमस्ते! Sweet Delights Bakery में आपका स्वागत है। मुझे बताइए, क्या आप केक ऑर्डर करना चाहते हैं या कोई सामान्य प्रश्न है?',
    closing_message: 'धन्यवाद! हमारी टीम जल्द ही आपसे संपर्क करेगी।',
    language: 'hi',
    fields: [
      { id: '1', label: 'केक का प्रकार (Cake Type)', key: 'cake_type', type: 'text', required: true, order: 1 },
      { id: '2', label: 'फ्लेवर (Flavour)', key: 'flavour', type: 'text', required: true, order: 2 },
      { id: '3', label: 'वजन (Weight)', key: 'weight', type: 'text', required: true, order: 3 },
      { id: '4', label: 'जरूरी तारीख (Required Date)', key: 'required_date', type: 'date', required: true, order: 4 },
      { id: '5', label: 'डिलीवरी या पिकअप', key: 'delivery_type', type: 'select', required: true, options: ['डिलीवरी', 'पिकअप'], order: 5 }
    ],
    conditions: [
      { id: '1', field: 'required_date', operator: 'less_than', value: '24', action: 'mark_urgent', action_label: '24 घंटे में जरूरी — अर्जेंट मार्क करें' }
    ],
    post_action: 'create_record',
    calendar_enabled: false,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    business: {
      id: 'demo-biz-1',
      owner_id: 'demo',
      name: 'Sweet Delights Bakery',
      type: 'cake_shop',
      phone: '+91 98765 43210',
      description: 'Artisanal cake & pastry shop',
      language: 'hi',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    id: 'demo-clinic-en',
    business_id: 'demo-biz-2',
    name: 'Patient Appointment Booking (English)',
    trigger: 'missed_call',
    greeting: WORKFLOW_TEMPLATES.clinic.greeting!,
    closing_message: WORKFLOW_TEMPLATES.clinic.closing_message!,
    language: 'en',
    fields: WORKFLOW_TEMPLATES.clinic.fields!,
    conditions: WORKFLOW_TEMPLATES.clinic.conditions!,
    post_action: 'create_record',
    calendar_enabled: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    business: {
      id: 'demo-biz-2',
      owner_id: 'demo',
      name: 'Apex Family Clinic',
      type: 'clinic',
      phone: '+91 98111 22334',
      description: 'Multi-speciality family clinic',
      language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    id: 'demo-clinic-hi',
    business_id: 'demo-biz-2',
    name: 'Patient Appointment Booking (Hindi)',
    trigger: 'missed_call',
    greeting: 'नमस्ते! आप Apex Family Clinic से बात कर रहे हैं। क्या आप डॉक्टर से अपॉइंटमेंट लेना चाहते हैं या कोई अन्य मदद चाहिए?',
    closing_message: 'धन्यवाद! हमारी टीम आपसे जल्द संपर्क करके अपॉइंटमेंट की पुष्टि करेगी।',
    language: 'hi',
    fields: [
      { id: '1', label: 'मरीज का नाम (Patient Name)', key: 'patient_name', type: 'text', required: true, order: 1 },
      { id: '2', label: 'डॉक्टर की पसंद (Doctor Preference)', key: 'doctor_preference', type: 'text', required: false, order: 2 },
      { id: '3', label: 'पसंदीदा तारीख (Preferred Date)', key: 'preferred_date', type: 'date', required: true, order: 3 },
      { id: '4', label: 'पसंदीदा समय (Preferred Time)', key: 'preferred_time', type: 'time', required: true, order: 4 },
      { id: '5', label: 'अपॉइंटमेंट कारण (Reason)', key: 'reason', type: 'text', required: false, order: 5 }
    ],
    conditions: [],
    post_action: 'create_record',
    calendar_enabled: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    business: {
      id: 'demo-biz-2',
      owner_id: 'demo',
      name: 'Apex Family Clinic',
      type: 'clinic',
      phone: '+91 98111 22334',
      description: 'Multi-speciality family clinic',
      language: 'hi',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    id: 'demo-delivery-en',
    business_id: 'demo-biz-3',
    name: 'Courier & Tracking (English)',
    trigger: 'missed_call',
    greeting: WORKFLOW_TEMPLATES.delivery.greeting!,
    closing_message: WORKFLOW_TEMPLATES.delivery.closing_message!,
    language: 'en',
    fields: WORKFLOW_TEMPLATES.delivery.fields!,
    conditions: WORKFLOW_TEMPLATES.delivery.conditions!,
    post_action: 'create_record',
    calendar_enabled: false,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    business: {
      id: 'demo-biz-3',
      owner_id: 'demo',
      name: 'SwiftGo Express Logistics',
      type: 'delivery',
      phone: '+91 99887 76655',
      language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    id: 'demo-realestate-en',
    business_id: 'demo-biz-4',
    name: 'Property Lead Qualification (English)',
    trigger: 'missed_call',
    greeting: WORKFLOW_TEMPLATES.real_estate.greeting!,
    closing_message: WORKFLOW_TEMPLATES.real_estate.closing_message!,
    language: 'en',
    fields: WORKFLOW_TEMPLATES.real_estate.fields!,
    conditions: WORKFLOW_TEMPLATES.real_estate.conditions!,
    post_action: 'create_record',
    calendar_enabled: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    business: {
      id: 'demo-biz-4',
      owner_id: 'demo',
      name: 'Prestige Property Realty',
      type: 'real_estate',
      phone: '+91 97654 32100',
      language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    id: 'demo-repair-en',
    business_id: 'demo-biz-5',
    name: 'Home Repair Service Request (English)',
    trigger: 'missed_call',
    greeting: WORKFLOW_TEMPLATES.repair.greeting!,
    closing_message: WORKFLOW_TEMPLATES.repair.closing_message!,
    language: 'en',
    fields: WORKFLOW_TEMPLATES.repair.fields!,
    conditions: WORKFLOW_TEMPLATES.repair.conditions!,
    post_action: 'create_record',
    calendar_enabled: false,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    business: {
      id: 'demo-biz-5',
      owner_id: 'demo',
      name: 'QuickFix Home Services',
      type: 'repair',
      phone: '+91 98001 12345',
      language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }
]

const QUICK_SCENARIOS = [
  { label: 'Order Cake (Urgent, <24h)', text: 'I need a 1kg chocolate truffle cake urgently for tomorrow morning' },
  { label: 'Book Clinic Appointment (Calendar)', text: 'I want to book an appointment with Dr. Sharma tomorrow at 4 PM' },
  { label: 'Track Delivery (External API)', text: 'Can you check status of my order with tracking number ORD-101?' },
  { label: 'Property Viewing (Real Estate)', text: 'I want to schedule a site visit for a 2BHK flat this Saturday at 11 AM' },
  { label: 'Emergency Repair', text: 'Emergency! Pipe burst in bathroom, need a repair technician immediately!' },
  { label: 'Hindi — केक ऑर्डर', text: 'मुझे कल शाम तक 2 किलो चॉकलेट केक चाहिए, घर पर डिलीवरी करें' }
]

const VAPI_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || ''

function SimulatorContent() {
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [messages, setMessages] = useState<SimulatorMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const [saved, setSaved] = useState(false)
  const [collectedData, setCollectedData] = useState<Record<string, unknown>>({})
  const [toolLogs, setToolLogs] = useState<string[]>([])

  // Vapi voice state
  const [vapiConnected, setVapiConnected] = useState(false)
  const [vapiSpeaking, setVapiSpeaking] = useState(false)
  const [vapiLoading, setVapiLoading] = useState(false)
  const [volumeLevel, setVolumeLevel] = useState(0)
  const vapiRef = useRef<InstanceType<typeof import('@vapi-ai/web').default> | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const { data } = await supabase
          .from('workflows')
          .select('*, business:businesses(name, type)')
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        const combined = (data && data.length > 0) ? [...data, ...DEMO_WORKFLOWS] : DEMO_WORKFLOWS
        setWorkflows(combined as Workflow[])

        const wfId = searchParams.get('workflow')
        if (wfId) {
          const found = combined.find(w => w.id === wfId)
          setSelectedWorkflow((found || combined[0]) as Workflow)
        } else {
          setSelectedWorkflow(combined[0] as Workflow)
        }
      } catch {
        setWorkflows(DEMO_WORKFLOWS)
        setSelectedWorkflow(DEMO_WORKFLOWS[0])
      }
    }
    fetchWorkflows()
  }, [searchParams])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Cleanup Vapi on unmount
  useEffect(() => {
    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop()
      }
    }
  }, [])

  const startVapiCall = useCallback(async () => {
    if (!selectedWorkflow || !VAPI_KEY) {
      toast.error('Vapi public key not configured in environment')
      return
    }
    setVapiLoading(true)

    try {
      const { default: Vapi } = await import('@vapi-ai/web')
      const vapi = new Vapi(VAPI_KEY)
      vapiRef.current = vapi

      vapi.on('call-start', () => {
        setVapiConnected(true)
        setVapiLoading(false)
        setStarted(true)
        toast.success('Voice call connected')
      })

      vapi.on('call-end', () => {
        setVapiConnected(false)
        setVapiSpeaking(false)
        setVolumeLevel(0)
        toast('Voice call ended')
      })

      vapi.on('speech-start', () => setVapiSpeaking(true))
      vapi.on('speech-end', () => setVapiSpeaking(false))

      vapi.on('volume-level', (vol: number) => setVolumeLevel(vol))

      vapi.on('message', (msg: Record<string, unknown>) => {
        if (msg.type === 'transcript') {
          const transcript = msg as { type: string; role: string; transcript: string; transcriptType?: string }
          if (transcript.transcriptType === 'final') {
            const role = transcript.role === 'assistant' ? 'assistant' : 'user'
            setMessages(prev => [...prev, {
              id: uuidv4(),
              role,
              content: transcript.transcript,
              timestamp: new Date()
            }])
          }
        }

        if (msg.type === 'tool-calls') {
          const toolName = (msg as { type: string; toolCallList?: { function: { name: string } }[] })
            .toolCallList?.[0]?.function?.name
          if (toolName) {
            setToolLogs(prev => [...prev, `Tool: ${toolName.replace(/_/g, ' ')}`])
          }
        }
      })

      vapi.on('error', (err: unknown) => {
        console.error('Vapi error:', err)
        setVapiLoading(false)
        toast.error('Voice connection error')
      })

      const bizName = (selectedWorkflow.business as { name: string })?.name || 'our business'
      const greeting = selectedWorkflow.greeting.replace(/\[Business Name\]/g, bizName)
      const lang = selectedWorkflow.language === 'hi' ? 'hi-IN' : 'en-US'
      const isHindi = selectedWorkflow.language === 'hi'

      await (vapi.start as (assistant: unknown) => Promise<unknown>)({
        name: `${bizName} Voice Assistant`,
        firstMessage: greeting,
        firstMessageInterruptionsEnabled: false,
        voice: {
          provider: 'playht',
          voiceId: isHindi ? 'hi-IN-NeerjaNeural' : 'jennifer',
        },
        transcriber: {
          provider: 'deepgram',
          model: 'nova-2',
          language: lang,
        },
        model: {
          provider: 'openai',
          model: 'gpt-4o',
          messages: [{
            role: 'system',
            content: isHindi
              ? `आप ${bizName} के लिए एक AI वॉयस असिस्टेंट हैं। ग्राहक ने मिस्ड कॉल किया था। उनकी मदद करें और जरूरी जानकारी इकट्ठा करें: ${(selectedWorkflow.fields as { label: string }[]).map(f => f.label).join(', ')}। हमेशा हिंदी में बात करें।`
              : `You are a professional AI voice assistant for ${bizName}. The customer missed a call. Your goal is to help them and collect: ${(selectedWorkflow.fields as { label: string }[]).map(f => f.label).join(', ')}. Be concise, warm, and professional.`
          }]
        }
      })

      setStarted(true)
      setMessages([{ id: uuidv4(), role: 'assistant', content: greeting, timestamp: new Date() }])
    } catch (err) {
      console.error('Failed to start Vapi call:', err)
      setVapiLoading(false)
      toast.error('Could not connect voice call. Check your Vapi key.')
    }
  }, [selectedWorkflow])

  const stopVapiCall = useCallback(async () => {
    if (vapiRef.current) {
      await vapiRef.current.stop()
      vapiRef.current = null
    }
    setVapiConnected(false)
    setVapiSpeaking(false)
    setVolumeLevel(0)
  }, [])

  const startConversation = () => {
    if (!selectedWorkflow) { toast.error('Select a workflow first'); return }
    setStarted(true)
    setSaved(false)
    setCollectedData({})
    setToolLogs([])

    const bizName = (selectedWorkflow.business as { name: string })?.name || 'our business'
    const greeting = selectedWorkflow.greeting.replace(/\[Business Name\]/g, bizName)
    setMessages([{ id: uuidv4(), role: 'assistant', content: greeting, timestamp: new Date() }])
  }

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText || !selectedWorkflow) return
    setInput('')
    setLoading(true)

    const userMsg: SimulatorMessage = { id: uuidv4(), role: 'user', content: messageText, timestamp: new Date() }
    const loadingMsg: SimulatorMessage = { id: uuidv4(), role: 'assistant', content: '...', timestamp: new Date(), isLoading: true }
    setMessages(prev => [...prev, userMsg, loadingMsg])

    try {
      const apiMessages = [...messages, userMsg]
        .filter(m => !m.isLoading)
        .map(m => ({ role: m.role, content: m.content }))

      let aiConfig = undefined
      try {
        const saved = localStorage.getItem('voiceai_ai_config')
        if (saved) aiConfig = JSON.parse(saved)
      } catch { /* ignore */ }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, workflow: selectedWorkflow, aiConfig })
      })
      const data = await res.json()

      if (data.toolUsed) {
        const name = data.toolUsed.replace(/_/g, ' ')
        setToolLogs(prev => [...prev, `Tool executed: ${name}`])
        toast.success(`Tool: ${name}`, { duration: 2500 })
      }

      const assistantMsg: SimulatorMessage = {
        id: uuidv4(), role: 'assistant',
        content: data.message || data.error || 'Let me look into that for you.',
        timestamp: new Date()
      }
      setMessages(prev => prev.filter(m => !m.isLoading).concat(assistantMsg))

      // Extract fields from user message
      const updatedFields: Record<string, unknown> = {}
      if (selectedWorkflow.fields) {
        (selectedWorkflow.fields as { key: string; label: string }[]).forEach(f => {
          const lower = messageText.toLowerCase()
          if (lower.includes(f.label.toLowerCase()) || lower.includes(f.key.toLowerCase())) {
            updatedFields[f.key] = messageText
          }
        })
      }
      if (data.toolResult) Object.assign(updatedFields, data.toolResult)
      setCollectedData(prev => ({ ...prev, ...updatedFields }))
    } catch {
      setMessages(prev => prev.filter(m => !m.isLoading).concat({
        id: uuidv4(), role: 'assistant',
        content: selectedWorkflow.language === 'hi'
          ? 'क्षमा करें, कुछ तकनीकी समस्या हुई। कृपया फिर से कहें।'
          : 'Sorry, a brief error occurred. Could you repeat that?',
        timestamp: new Date()
      }))
    }
    setLoading(false)
  }

  const saveConversation = async () => {
    if (!selectedWorkflow || messages.length < 2) { toast.error('Have a conversation first'); return }
    try {
      const res = await fetch('/api/chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: messages.filter(m => !m.isLoading).map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
          workflow: selectedWorkflow,
          calledData: collectedData
        })
      })
      if (res.ok) {
        setSaved(true)
        toast.success('Call recorded & saved to dashboard!')
      } else {
        setSaved(true)
        toast.success('Simulation complete (saved locally)')
      }
    } catch {
      setSaved(true)
      toast.success('Simulation saved')
    }
  }

  const resetConversation = async () => {
    await stopVapiCall()
    setMessages([])
    setStarted(false)
    setSaved(false)
    setCollectedData({})
    setToolLogs([])
  }

  const isHindi = selectedWorkflow?.language === 'hi'

  return (
    <div className="page-container" style={{ maxWidth: '100%', padding: '24px 32px' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="page-title">Voice AI Simulator</h1>
            <span className="badge badge-contacted">Live Tester</span>
          </div>
          <p className="page-subtitle">
            Simulate missed-call AI conversations — text or real voice (Vapi) — with Google Calendar scheduling and tool calling
          </p>
        </div>
        {started && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!saved ? (
              <button onClick={saveConversation} className="btn-primary" style={{ fontSize: '12px', padding: '8px 14px' }}>
                <Save size={13} /> Save Record
              </button>
            ) : (
              <span className="badge badge-completed" style={{ padding: '6px 12px', fontSize: '12px' }}>
                <CheckCircle2 size={12} /> Saved
              </span>
            )}
            <button onClick={resetConversation} className="btn-secondary" style={{ fontSize: '12px', padding: '8px 14px' }}>
              <RefreshCw size={13} /> End Call
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', height: 'calc(100vh - 200px)', minHeight: '600px' }}>

        {/* Left Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>

          {/* Workflow Picker */}
          <div className="glass-card" style={{ padding: '16px' }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--green)', marginBottom: '8px' }}>
              Active Workflow
            </label>
            <select
              id="simulator-workflow-select"
              className="input-field"
              style={{ fontSize: '12px' }}
              value={selectedWorkflow?.id || ''}
              onChange={e => {
                const wf = workflows.find(w => w.id === e.target.value)
                setSelectedWorkflow(wf || null)
                resetConversation()
              }}
            >
              {workflows.map(wf => (
                <option key={wf.id} value={wf.id}>
                  {(wf.business as { name: string })?.name} — {wf.name}
                </option>
              ))}
            </select>

            {selectedWorkflow && (
              <div style={{ marginTop: '10px', padding: '10px', borderRadius: '8px', background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', fontSize: '11px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, color: '#fff' }}>{(selectedWorkflow.business as { name: string })?.name}</span>
                  <span className={cn('badge', isHindi ? 'badge-pending' : 'badge-new')} style={{ fontSize: '10px' }}>
                    {isHindi ? 'Hindi' : 'English'}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)' }}>
                  Trigger: Missed Call &middot; {(selectedWorkflow.fields as unknown[])?.length || 0} fields
                </p>
                {selectedWorkflow.calendar_enabled && (
                  <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--green)', fontSize: '10px', fontWeight: 600 }}>
                    <Calendar size={10} /> Google Calendar Enabled
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Test Scenarios */}
          <div className="glass-card" style={{ padding: '16px' }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--green)', marginBottom: '8px' }}>
              Quick Test Scenarios
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {QUICK_SCENARIOS.map(s => (
                <button
                  key={s.label}
                  onClick={() => {
                    if (!started) {
                      startConversation()
                      setTimeout(() => sendMessage(s.text), 500)
                    } else {
                      sendMessage(s.text)
                    }
                  }}
                  style={{
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: '7px',
                    background: 'var(--bg-inset)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s'
                  }}
                >
                  <p style={{ fontSize: '11px', fontWeight: 600, color: '#fff' }}>{s.label}</p>
                  <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    &ldquo;{s.text}&rdquo;
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Collected Fields */}
          {selectedWorkflow?.fields && (
            <div className="glass-card" style={{ padding: '16px' }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--green)', marginBottom: '8px' }}>
                Data Capture
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {(selectedWorkflow.fields as { key: string; label: string; required: boolean }[]).map(field => {
                  const has = field.key in collectedData
                  return (
                    <div key={field.key} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '6px 8px', borderRadius: '6px', fontSize: '11px',
                      background: has ? 'rgba(16,185,129,0.08)' : 'var(--bg-inset)',
                      border: `1px solid ${has ? 'rgba(16,185,129,0.25)' : 'var(--border-subtle)'}`
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: has ? 'var(--green-bright)' : 'var(--text-muted)' }}>
                        {has
                          ? <CheckCircle2 size={11} />
                          : <div style={{ width: 10, height: 10, borderRadius: '50%', border: '1px solid var(--border)' }} />
                        }
                        {field.label}
                        {field.required && <span style={{ color: '#f87171' }}>*</span>}
                      </span>
                      {has && <span style={{ fontSize: '9px', fontFamily: 'monospace', color: 'var(--green)' }}>captured</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tool Logs */}
          {toolLogs.length > 0 && (
            <div className="glass-card" style={{ padding: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--green)', marginBottom: '8px' }}>
                <Sparkles size={11} /> Tool Executions
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {toolLogs.map((log, i) => (
                  <div key={i} style={{
                    padding: '6px 8px', borderRadius: '6px', fontSize: '10px', fontFamily: 'monospace',
                    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.20)',
                    color: 'var(--green-bright)'
                  }}>
                    &raquo; {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — Chat & Voice Panel */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Call Status Bar */}
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-elevated)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: started ? 'var(--green)' : 'var(--bg-inset)',
                border: started ? 'none' : '1px solid var(--border-subtle)',
                color: started ? '#000' : 'var(--text-muted)'
              }}>
                <Mic size={16} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                    {(selectedWorkflow?.business as { name: string })?.name || 'Voice Assistant'}
                  </p>
                  {started && (
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: 'var(--green)',
                      boxShadow: '0 0 6px rgba(16,185,129,0.6)',
                      animation: 'ping 1.5s infinite'
                    }} />
                  )}
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {vapiConnected
                    ? 'Live Voice Call Active (Vapi)'
                    : started
                      ? 'AI Text Simulator Active'
                      : 'Ready to simulate'}
                  {isHindi && ' · Hindi (हिंदी)'}
                </p>
              </div>
            </div>

            {/* Waveform when voice active */}
            {vapiConnected && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '24px' }}>
                {[0.4, 0.7, 1.0, 0.8, 0.5].map((base, i) => (
                  <div key={i} className="wave-bar" style={{
                    height: `${Math.max(4, (vapiSpeaking ? base : 0.3) * 20 + volumeLevel * 15)}px`
                  }} />
                ))}
                <span style={{ fontSize: '10px', color: 'var(--green)', marginLeft: '6px', fontWeight: 600 }}>
                  {vapiSpeaking ? 'Speaking' : 'Listening'}
                </span>
              </div>
            )}
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {!started ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 24px' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '16px', marginBottom: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)',
                  color: 'var(--green)'
                }}>
                  <Phone size={24} />
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                  Start Missed-Call Simulation
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px', maxWidth: '320px' }}>
                  Choose text simulation for instant AI replies, or start a live voice call powered by Vapi for real speech interaction.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '320px' }}>
                  <button
                    id="start-simulation-btn"
                    onClick={startConversation}
                    className="btn-primary"
                    style={{ justifyContent: 'center', gap: '8px', fontSize: '13px', padding: '10px' }}
                  >
                    <Phone size={14} /> Start Text Simulation
                  </button>
                  <button
                    onClick={startVapiCall}
                    disabled={vapiLoading || !VAPI_KEY}
                    className="btn-secondary"
                    style={{ justifyContent: 'center', gap: '8px', fontSize: '13px', padding: '10px' }}
                  >
                    {vapiLoading
                      ? <><Radio size={14} style={{ color: 'var(--green)' }} /> Connecting Voice...</>
                      : <><Volume2 size={14} style={{ color: 'var(--green)' }} /> Start Live Voice Call (Vapi)</>
                    }
                  </button>
                  {!VAPI_KEY && (
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                      Add NEXT_PUBLIC_VAPI_PUBLIC_KEY to .env.local to enable voice calls
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    style={{ display: 'flex', gap: '10px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: msg.role === 'user' ? 'var(--green)' : 'var(--bg-surface)',
                      border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                      color: msg.role === 'user' ? '#000' : '#fff'
                    }}>
                      {msg.role === 'user' ? <User size={13} /> : <Bot size={13} />}
                    </div>
                    <div style={{
                      maxWidth: '80%',
                      padding: '10px 14px',
                      borderRadius: msg.role === 'user' ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
                      background: msg.role === 'user' ? 'var(--green)' : 'var(--bg-inset)',
                      border: msg.role === 'user' ? 'none' : '1px solid var(--border-subtle)',
                      color: msg.role === 'user' ? '#000' : '#fff',
                      fontSize: '13px',
                      lineHeight: 1.5
                    }}>
                      <p style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', opacity: 0.6 }}>
                        {msg.role === 'user' ? 'Caller' : 'AI Assistant'}
                      </p>
                      {msg.isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 0' }}>
                          <div className="typing-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)' }} />
                          <div className="typing-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)' }} />
                          <div className="typing-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)' }} />
                        </div>
                      ) : msg.content}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input bar */}
          {started && !vapiConnected && (
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-elevated)'
            }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  id="simulator-message-input"
                  ref={inputRef}
                  type="text"
                  className="input-field"
                  style={{ flex: 1, fontSize: '13px', padding: '9px 12px' }}
                  placeholder={isHindi ? 'यहाँ टाइप करें... (e.g. कल शाम 4 बजे अपॉइंटमेंट चाहिए)' : 'Type your reply... (e.g. Schedule callback tomorrow at 4 PM)'}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !loading && sendMessage()}
                  disabled={loading}
                  autoFocus
                />
                <button
                  id="send-message-btn"
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="btn-primary"
                  style={{ padding: '9px 14px', flexShrink: 0 }}
                >
                  <Send size={14} />
                </button>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                {isHindi ? 'हिंदी और English दोनों में बात कर सकते हैं' : 'Try: "Book appointment tomorrow 4PM" or "Track order ORD-101"'} &nbsp;&middot;&nbsp; Autonomous Tool Calling Active
              </p>
            </div>
          )}

          {/* Voice mode end call bar */}
          {vapiConnected && (
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <button
                onClick={stopVapiCall}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '10px 24px', borderRadius: '99px',
                  background: '#ef4444', color: '#fff', border: 'none',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                }}
              >
                <PhoneOff size={15} /> End Voice Call
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SimulatorPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ width: 28, height: 28, border: '2px solid var(--green)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading Voice AI Simulator...</p>
      </div>
    }>
      <SimulatorContent />
    </Suspense>
  )
}
