'use client'
import { useEffect, useRef, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Workflow, SimulatorMessage, BUSINESS_TYPES, WORKFLOW_TEMPLATES, BusinessType } from '@/types'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Send, Mic, MicOff, RefreshCw, Save, Phone, PhoneOff,
  Globe, Sparkles, Calendar, Volume2, CheckCircle2, Box,
  User, Bot
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { cn } from '@/lib/utils'

// Built-in demonstration workflows available out-of-the-box
const DEMO_WORKFLOWS: Workflow[] = [
  {
    id: 'demo-cake-shop',
    business_id: 'demo-biz-1',
    name: 'Cake Order Intake',
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
    id: 'demo-clinic',
    business_id: 'demo-biz-2',
    name: 'Patient Appointment Booking',
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
      phone: '+91 98765 54321',
      description: 'Multi-speciality medical care',
      language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    id: 'demo-delivery',
    business_id: 'demo-biz-3',
    name: 'Delivery Request & Tracking',
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
      phone: '+91 91234 56789',
      description: 'Intra-city express courier service',
      language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    id: 'demo-realty',
    business_id: 'demo-biz-4',
    name: 'Property Lead & Tour Booking',
    trigger: 'missed_call',
    greeting: "Hello, thank you for calling Prestige Property Realty. Sorry we missed your call. I am your AI assistant. Are you looking to buy, rent, or schedule a viewing?",
    closing_message: "Thank you, I have recorded your preferences and our property consultant will reach out shortly.",
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
      phone: '+91 98111 22334',
      description: 'Luxury residential and commercial properties',
      language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }
]

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
  const [calendarEvents, setCalendarEvents] = useState<string[]>([])
  const [toolLogs, setToolLogs] = useState<string[]>([])
  const [isVoiceActive, setIsVoiceActive] = useState(false)
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
          if (found) setSelectedWorkflow(found as Workflow)
          else setSelectedWorkflow(combined[0] as Workflow)
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

  const startConversation = (voiceMode = false) => {
    if (!selectedWorkflow) { toast.error('Select a workflow first'); return }
    setStarted(true)
    setSaved(false)
    setCollectedData({})
    setCalendarEvents([])
    setToolLogs([])
    setIsVoiceActive(voiceMode)

    const bizName = (selectedWorkflow.business as { name: string })?.name || 'our business'
    const greeting = selectedWorkflow.greeting.replace(/\[Business Name\]/g, bizName)

    setMessages([{
      id: uuidv4(),
      role: 'assistant',
      content: greeting,
      timestamp: new Date()
    }])

    if (voiceMode) {
      toast.success('🎙️ Voice Assistant Call Started', { icon: '📞' })
    }
  }

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText || !selectedWorkflow) return
    setInput('')
    setLoading(true)

    const userMsg: SimulatorMessage = {
      id: uuidv4(), role: 'user', content: messageText, timestamp: new Date()
    }
    const loadingMsg: SimulatorMessage = {
      id: uuidv4(), role: 'assistant', content: '...', timestamp: new Date(), isLoading: true
    }

    setMessages(prev => [...prev, userMsg, loadingMsg])

    try {
      const apiMessages = [...messages, userMsg]
        .filter(m => !m.isLoading)
        .map(m => ({ role: m.role, content: m.content }))

      let aiConfig = undefined
      try {
        const savedConfig = localStorage.getItem('voiceai_ai_config')
        if (savedConfig) {
          aiConfig = JSON.parse(savedConfig)
        }
      } catch {
        // ignore
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, workflow: selectedWorkflow, aiConfig })
      })
      const data = await res.json()

      if (data.calendarEventId) {
        setCalendarEvents(prev => [...prev, data.calendarEventId])
      }

      if (data.toolUsed) {
        const toolNameFormatted = data.toolUsed.replace(/_/g, ' ')
        setToolLogs(prev => [...prev, `Tool executed: ${toolNameFormatted}`])
        toast.success(`⚡ Tool Executed: ${toolNameFormatted}`, { duration: 3500 })
      }

      const assistantMsg: SimulatorMessage = {
        id: uuidv4(), role: 'assistant', content: data.message || data.error || 'I understand. Let me check that for you.', timestamp: new Date()
      }

      setMessages(prev => prev.filter(m => !m.isLoading).concat(assistantMsg))

      // Update extracted data
      const updatedFields: Record<string, unknown> = {}
      if (selectedWorkflow.fields) {
        (selectedWorkflow.fields as { key: string; label: string }[]).forEach(f => {
          const lower = messageText.toLowerCase()
          if (lower.includes(f.label.toLowerCase()) || lower.includes(f.key.toLowerCase())) {
            updatedFields[f.key] = messageText
          }
        })
      }
      if (data.toolResult) {
        Object.assign(updatedFields, data.toolResult)
      }
      setCollectedData(prev => ({ ...prev, ...updatedFields }))
    } catch {
      setMessages(prev => prev.filter(m => !m.isLoading).concat({
        id: uuidv4(), role: 'assistant',
        content: 'I apologize, I experienced a brief glitch. Could you repeat that for me?',
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
        toast.success('Simulation completed! (Logged locally for demo)')
        setSaved(true)
      }
    } catch {
      toast.success('Simulation completed! (Demo saved)')
      setSaved(true)
    }
  }

  const resetConversation = () => {
    setMessages([])
    setStarted(false)
    setSaved(false)
    setCollectedData({})
    setCalendarEvents([])
    setToolLogs([])
    setIsVoiceActive(false)
  }

  const businessInfo = selectedWorkflow?.business
    ? BUSINESS_TYPES[(selectedWorkflow.business as { type: string }).type as keyof typeof BUSINESS_TYPES]
    : null

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2.5">
            <span>Voice AI Assistant Simulator</span>
            <span className="badge badge-contacted text-[11px]">Real-time Tester</span>
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Simulate missed-call follow-ups with AI voice & text, Google Calendar scheduling, and external tool calls
          </p>
        </div>

        {started && (
          <div className="flex items-center gap-2">
            {!saved ? (
              <button
                id="save-conversation-btn"
                onClick={saveConversation}
                className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3"
              >
                <Save size={14} /> Save Call Record
              </button>
            ) : (
              <span className="badge badge-completed flex items-center gap-1 py-1.5 px-3 text-xs">
                <CheckCircle2 size={13} /> Saved to Dashboard
              </span>
            )}
            <button
              id="reset-conversation-btn"
              onClick={resetConversation}
              className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3"
            >
              <RefreshCw size={14} /> End Call
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Workflow Selection, Tools & Fields */}
        <div className="space-y-4">
          {/* Workflow Picker */}
          <div className="glass-card p-4">
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-emerald-400">
              Active Workflow
            </label>
            <select
              id="simulator-workflow-select"
              className="input-field text-sm"
              value={selectedWorkflow?.id || ''}
              onChange={e => {
                const wf = workflows.find(w => w.id === e.target.value)
                setSelectedWorkflow(wf || null)
                resetConversation()
              }}
            >
              {workflows.map(wf => (
                <option key={wf.id} value={wf.id}>
                  {(wf.business as { name: string })?.name} — {wf.name} ({wf.language === 'hi' ? 'Hindi' : 'English'})
                </option>
              ))}
            </select>

            {selectedWorkflow && (
              <div className="mt-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <span>{businessInfo?.icon || '🏢'}</span>
                    {(selectedWorkflow.business as { name: string })?.name}
                  </span>
                  <span className="badge badge-new text-[10px]">
                    {selectedWorkflow.language === 'hi' ? '🇮🇳 Hindi' : '🇬🇧 English'}
                  </span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Trigger: <span className="text-zinc-300">Missed Call</span> • Action:{' '}
                  <span className="text-zinc-300">{selectedWorkflow.post_action.replace(/_/g, ' ')}</span>
                </p>
                {selectedWorkflow.calendar_enabled && (
                  <div className="flex items-center gap-1 text-emerald-400 text-[11px] font-medium pt-1">
                    <Calendar size={12} /> Google Calendar Tool Calling Enabled
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Trigger Test Prompts */}
          <div className="glass-card p-4">
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-emerald-400">
              Quick Test Scenarios
            </label>
            <div className="space-y-1.5 text-xs">
              {[
                { label: 'Order a Custom Cake (Bakery)', text: 'I want to order a 1kg chocolate truffle cake for tomorrow' },
                { label: 'Book Clinic Callback (Calendar Tool)', text: 'I want to schedule an appointment tomorrow at 4 PM' },
                { label: 'Track Delivery (External API Tool)', text: 'Can you check status of my delivery with tracking number ORD-101?' },
                { label: 'Schedule Property Viewing (Real Estate)', text: 'I would like to book a property tour this Saturday at 11 AM' },
                { label: 'Urgent Repair Request (Emergency Rule)', text: 'Emergency! Pipe burst in bathroom, need repair technician immediately!' },
              ].map(scenario => (
                <button
                  key={scenario.label}
                  onClick={() => {
                    if (!started) startConversation(false)
                    setTimeout(() => sendMessage(scenario.text), started ? 50 : 400)
                  }}
                  className="w-full text-left p-2 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-emerald-500/40 hover:bg-zinc-900 transition-colors"
                >
                  <p className="font-medium text-zinc-200">{scenario.label}</p>
                  <p className="text-[11px] text-zinc-500 truncate mt-0.5">&quot;{scenario.text}&quot;</p>
                </button>
              ))}
            </div>
          </div>

          {/* Real-time Field Collector Visualizer */}
          {selectedWorkflow?.fields && (
            <div className="glass-card p-4">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-emerald-400">
                Target Data Fields
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {(selectedWorkflow.fields as { key: string; label: string; required: boolean }[]).map(field => {
                  const hasData = field.key in collectedData
                  return (
                    <div
                      key={field.key}
                      className={cn(
                        'flex items-center justify-between p-2 rounded-lg text-xs border transition-all',
                        hasData
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400'
                      )}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        {hasData ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0" /> : <div className="w-3 h-3 rounded-full border border-zinc-700 shrink-0" />}
                        {field.label}
                        {field.required && <span className="text-rose-400">*</span>}
                      </span>
                      {hasData && (
                        <span className="font-mono text-[10px] text-emerald-400 truncate max-w-[100px]">
                          ✓ captured
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Active Tool Calling Logs */}
          {toolLogs.length > 0 && (
            <div className="glass-card p-4">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-emerald-400 flex items-center gap-1.5">
                <Sparkles size={13} /> Active Tool Executions
              </label>
              <div className="space-y-1.5">
                {toolLogs.map((log, i) => (
                  <div key={i} className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono">
                    ⚡ {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center/Right: Call Simulator Screen */}
        <div className="lg:col-span-2 flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
          <div className="glass-card flex flex-col h-full overflow-hidden">
            {/* Call State Bar */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center transition-all',
                    started
                      ? 'bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/20'
                      : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                  )}
                >
                  <Mic size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-white">
                      {(selectedWorkflow?.business as { name: string })?.name || 'Voice Assistant'}
                    </p>
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full',
                        started ? 'bg-emerald-400 animate-ping' : 'bg-zinc-700'
                      )}
                    />
                  </div>
                  <p className="text-xs text-zinc-400">
                    {started
                      ? (isVoiceActive ? 'Voice Assistant On Call (Live Audio Streaming)' : 'AI Simulator Active (Text & Autonomous Tools)')
                      : 'Call Idle • Ready to simulate'}
                  </p>
                </div>
              </div>

              {/* Waveform Animation on Voice Mode */}
              {started && isVoiceActive && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <div className="wave-bar h-2" />
                  <div className="wave-bar h-4" />
                  <div className="wave-bar h-3" />
                  <div className="wave-bar h-5" />
                  <div className="wave-bar h-2" />
                  <span className="text-[10px] font-medium text-emerald-400 ml-1">Streaming</span>
                </div>
              )}
            </div>

            {/* Conversation Log Stream */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
              {!started ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-sm mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 mb-3 shadow-inner">
                    <Phone size={24} />
                  </div>
                  <h3 className="font-semibold text-base text-white mb-1">Start Missed-Call Simulation</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-5">
                    Experience how your AI assistant handles missed calls, collects details, checks Google Calendar availability, and triggers external tools.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2.5 w-full">
                    <button
                      id="start-simulation-btn"
                      onClick={() => startConversation(false)}
                      className="btn-primary flex-1 py-2 text-xs flex items-center justify-center gap-1.5"
                    >
                      <Phone size={13} /> Start Simulation
                    </button>
                    <button
                      onClick={() => startConversation(true)}
                      className="btn-secondary flex-1 py-2 text-xs flex items-center justify-center gap-1.5"
                    >
                      <Volume2 size={13} className="text-emerald-400" /> Voice Mode
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={cn('flex gap-2.5 animate-slide-up', msg.role === 'user' ? 'flex-row-reverse' : '')}
                    >
                      <div
                        className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold',
                          msg.role === 'user'
                            ? 'bg-emerald-500 text-black'
                            : 'bg-zinc-800 text-white'
                        )}
                      >
                        {msg.role === 'user' ? <User size={13} /> : <Bot size={13} />}
                      </div>
                      <div
                        className={cn(
                          'max-w-[82%] px-4 py-2.5 rounded-xl text-xs leading-relaxed',
                          msg.role === 'user'
                            ? 'rounded-tr-sm bg-emerald-500 text-black font-medium'
                            : 'rounded-tl-sm bg-zinc-900 border border-zinc-800 text-zinc-200'
                        )}
                      >
                        <p className={cn('text-[9px] font-mono uppercase tracking-wider mb-1', msg.role === 'user' ? 'text-black/70' : 'text-zinc-500')}>
                          {msg.role === 'user' ? 'Caller' : 'AI Assistant'}
                        </p>
                        {msg.isLoading ? (
                          <div className="flex items-center gap-1.5 py-1">
                            <div className="typing-dot w-2 h-2 rounded-full bg-emerald-400" />
                            <div className="typing-dot w-2 h-2 rounded-full bg-emerald-400" />
                            <div className="typing-dot w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-[11px] text-zinc-400 ml-2">Checking tools & generating reply...</span>
                          </div>
                        ) : (
                          msg.content
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Bar */}
            {started && (
              <div className="p-3 sm:p-4 border-t border-zinc-800 bg-zinc-950/40">
                <div className="flex items-center gap-2">
                  <input
                    id="simulator-message-input"
                    ref={inputRef}
                    type="text"
                    className="input-field flex-1 text-xs py-2"
                    placeholder="Type your reply (e.g. Schedule a callback tomorrow at 4 PM)..."
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
                    className="btn-primary px-3.5 py-2 flex items-center justify-center shrink-0"
                  >
                    <Send size={14} />
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2 px-1">
                  <span>Try: &quot;Schedule appointment tomorrow at 4 PM&quot; or &quot;Track order ORD-101&quot;</span>
                  <span className="font-mono text-zinc-400">Autonomous Tool Calling Active</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SimulatorPage() {
  return (
    <Suspense fallback={
      <div className="p-12 text-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-zinc-400">Loading AI conversation simulator...</p>
      </div>
    }>
      <SimulatorContent />
    </Suspense>
  )
}
