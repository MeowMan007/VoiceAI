'use client'
import { useEffect, useRef, useState, Suspense, useCallback } from 'react'
import { Workflow, SimulatorMessage } from '@/types'
import { useSearchParams } from 'next/navigation'
import { apiGet, apiSend } from '@/lib/api-client'
import toast from 'react-hot-toast'
import Link from 'next/link'
import {
  Send, Mic, Save, Phone, Sparkles, Calendar, Volume2,
  CheckCircle2, User, Bot, VolumeX, PlusCircle
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'

const ElevenLabsVoiceSimulator = dynamic(() => import('@/components/ElevenLabsVoiceSimulator'), { ssr: false })

type ChatResponse = {
  message?: string
  toolsUsed?: string[]
  toolUsed?: string
  collectedData?: Record<string, unknown>
  calendarEventId?: string
  calendarEventUrl?: string
  usedFallback?: boolean
  languageUsed?: 'en' | 'hi'
  error?: string
}

const QUICK_SCENARIOS = [
  { label: 'Order Cake (Urgent, <24h)', text: 'I need a 1kg chocolate truffle cake urgently for tomorrow morning' },
  { label: 'Book Clinic Appointment (Calendar)', text: 'I want to book an appointment with Dr. Sharma tomorrow at 4 PM' },
  { label: 'Track Delivery (External API)', text: 'Can you check status of my order with tracking number ORD-101?' },
  { label: 'Property Viewing (Real Estate)', text: 'I want to schedule a site visit for a 2BHK flat this Saturday at 11 AM' },
  { label: 'Emergency Repair', text: 'Emergency! Pipe burst in bathroom, need a repair technician immediately!' },
  { label: 'Hindi — केक ऑर्डर', text: 'मुझे कल शाम तक 2 किलो चॉकलेट केक चाहिए, घर पर डिलीवरी करें' }
]

function SimulatorContent() {
  const searchParams = useSearchParams()

  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [loadingWorkflows, setLoadingWorkflows] = useState(true)
  const [messages, setMessages] = useState<SimulatorMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [collectedData, setCollectedData] = useState<Record<string, unknown>>({})
  const [toolLogs, setToolLogs] = useState<string[]>([])
  const [calendarEvent, setCalendarEvent] = useState<{ id?: string; url?: string }>({})
  const [ttsError, setTtsError] = useState<string | null>(null)

  // Voice vs Chat simulator mode — default to VOICE
  const [simulatorMode, setSimulatorMode] = useState<'voice' | 'chat'>('voice')
  const [autoSpeak, setAutoSpeak] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Load workflows with resilient fallback
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        let wfs: Workflow[] = []
        try {
          wfs = await apiGet<Workflow[]>('/api/workflows')
        } catch {
          // api fetch failed
        }
        if (!wfs || wfs.length === 0) {
          const { localDB } = await import('@/lib/local-db')
          wfs = localDB.workflows.list()
        }
        if (cancelled) return
        setWorkflows(wfs)
        const wfId = searchParams.get('workflow')
        const found = wfId ? wfs.find(w => w.id === wfId) : undefined
        setSelectedWorkflow(found || wfs[0] || null)
      } catch (err) {
        if (!cancelled) toast.error('Loaded default offline workflows')
      } finally {
        if (!cancelled) setLoadingWorkflows(false)
      }
    })()
    return () => { cancelled = true }
  }, [searchParams])


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
  }, [])

  const fallbackBrowserSpeech = useCallback((text: string, language?: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setTtsError('Spoken audio stream unavailable.')
      return
    }
    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      const isHindi = language === 'hi' || /[\u0900-\u097F]/.test(text)
      utterance.lang = isHindi ? 'hi-IN' : 'en-US'
      utterance.rate = 1.0

      const voices = window.speechSynthesis.getVoices()
      if (isHindi) {
        const hiVoice = voices.find(v => v.lang.startsWith('hi'))
        if (hiVoice) utterance.voice = hiVoice
      } else {
        const enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Female')))
        if (enVoice) utterance.voice = enVoice
      }

      setTtsError('Audio fallback: playing voice via browser speech synthesis.')
      window.speechSynthesis.speak(utterance)
    } catch {
      setTtsError('Spoken audio unavailable.')
    }
  }, [])

  // Spoken playback via ElevenLabs TTS route with browser speech synthesis fallback
  const speakViaTts = useCallback(async (text: string, language?: string) => {
    stopAudio()
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: language || 'en' }),
      })
      if (!res.ok) throw new Error('tts_unavailable')
      const blob = await res.blob()
      if (blob.size < 200) throw new Error('tts_empty')
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => URL.revokeObjectURL(url)
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        fallbackBrowserSpeech(text, language)
      }
      await audio.play()
      setTtsError(null)
    } catch {
      fallbackBrowserSpeech(text, language)
    }
  }, [stopAudio, fallbackBrowserSpeech])

  const startConversation = () => {
    if (!selectedWorkflow) { toast.error('Select a workflow first'); return }
    setStarted(true)
    setSaved(false)
    setCollectedData({})
    setToolLogs([])
    setCalendarEvent({})

    const bizName = selectedWorkflow.business?.name || 'our business'
    const greeting = selectedWorkflow.greeting.replace(/\[Business Name\]/g, bizName)
    setMessages([{ id: uuidv4(), role: 'assistant', content: greeting, timestamp: new Date() }])

    if (autoSpeak) {
      speakViaTts(greeting, selectedWorkflow.language)
    }
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

      // Server resolves the LLM provider from its own env keys; we only express a preference.
      const data = await apiSend<ChatResponse>('/api/chat', 'POST', {
        messages: apiMessages,
        workflow: selectedWorkflow,
        aiConfig: { provider: 'gemini' },
      })

      if (data.toolsUsed?.length) {
        data.toolsUsed.forEach(name => setToolLogs(prev => [...prev, `Tool executed: ${name.replace(/_/g, ' ')}`]))
        const last = data.toolUsed?.replace(/_/g, ' ')
        if (last) toast.success(`Tool: ${last}`, { duration: 2500 })
      }

      const replyContent = data.message || 'Let me look into that for you.'
      const assistantMsg: SimulatorMessage = {
        id: uuidv4(), role: 'assistant',
        content: replyContent,
        timestamp: new Date()
      }
      setMessages(prev => prev.filter(m => !m.isLoading).concat(assistantMsg))

      if (autoSpeak) {
        speakViaTts(replyContent, data.languageUsed || selectedWorkflow.language)
      }

      // Consume the orchestrator's structured tool output — the model reports what it captured
      // via save_customer_data, so there is no client-side keyword guessing.
      if (data.collectedData && Object.keys(data.collectedData).length) {
        setCollectedData(prev => ({ ...prev, ...data.collectedData }))
      }
      if (data.calendarEventId) {
        setCalendarEvent({ id: data.calendarEventId, url: data.calendarEventUrl })
      }
    } catch (err) {
      const fallbackText = selectedWorkflow.language === 'hi'
        ? 'क्षमा करें, कुछ तकनीकी समस्या हुई। कृपया फिर से कहें।'
        : 'Sorry, a brief error occurred. Could you repeat that?'
      setMessages(prev => prev.filter(m => !m.isLoading).concat({
        id: uuidv4(), role: 'assistant',
        content: fallbackText,
        timestamp: new Date()
      }))
      toast.error(err instanceof Error ? err.message : 'Request failed')
      if (autoSpeak) speakViaTts(fallbackText, selectedWorkflow.language)
    }
    setLoading(false)
  }

  // Persist the conversation as a real call record via PUT /api/chat.
  // The server generates the summary, evaluates urgency conditions, and inserts under RLS.
  const saveConversation = async () => {
    if (!selectedWorkflow || messages.length < 2) { toast.error('Have a conversation first'); return }
    setSaving(true)
    try {
      const transcript = messages
        .filter(m => !m.isLoading)
        .map(m => ({ role: m.role, content: m.content, timestamp: String(m.timestamp) }))

      try {
        await apiSend('/api/chat', 'PUT', {
          transcript,
          workflow: selectedWorkflow,
          calledData: collectedData,
          calendarEventId: calendarEvent.id,
          calendarEventUrl: calendarEvent.url,
        })
      } catch {
        // Direct localDB fallback
        const { localDB } = await import('@/lib/local-db')
        const callerName = String(collectedData.caller_name || collectedData.patient_name || collectedData.contact_name || 'Caller')
        const callerPhone = String(collectedData.caller_phone || collectedData.contact_number || '+91 98000 00000')
        const intent = String(
          collectedData.order_type ||
          collectedData.request_type ||
          collectedData.interest_type ||
          collectedData.service_type ||
          'Customer Call Inquiry'
        )
        const isUrgent = String(collectedData.urgency || '').toLowerCase().includes('urgent') ||
          String(collectedData.required_date || '').includes('24')
        localDB.calls.create({
          business_id: selectedWorkflow.business_id || (selectedWorkflow as any).businessId,
          workflow_id: selectedWorkflow.id,
          caller_name: callerName,
          caller_phone: callerPhone,
          intent,
          summary: `Call handled by Voice AI assistant (${selectedWorkflow.name}). Captured details: ${JSON.stringify(collectedData)}`,
          urgency: isUrgent ? 'urgent' : 'normal',
          follow_up_status: 'pending',
          status: 'completed',
          transcript,
          collected_data: collectedData,
          language_used: selectedWorkflow.language || 'en',
          calendar_event_id: calendarEvent.id,
          calendar_event_url: calendarEvent.url,
        } as any)
      }

      setSaved(true)
      toast.success('Call saved to your dashboard records')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save call record')
    } finally {
      setSaving(false)
    }
  }


  const resetConversation = () => {
    stopAudio()
    setMessages([])
    setStarted(false)
    setSaved(false)
    setCollectedData({})
    setToolLogs([])
    setCalendarEvent({})
    setTtsError(null)
  }

  const isHindi = selectedWorkflow?.language === 'hi'

  // Empty state — the simulator runs against real, owned workflows only.
  if (!loadingWorkflows && workflows.length === 0) {
    return (
      <div className="page-container" style={{ maxWidth: '100%', padding: '24px 32px' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Voice AI Personal Assistant Simulator</h1>
            <p className="page-subtitle">Simulate missed-call AI conversations with live voice, tool calling, and record capture.</p>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '48px 32px', textAlign: 'center', maxWidth: 520, margin: '48px auto' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '16px', margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--green)'
          }}>
            <PlusCircle size={26} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>No workflows yet</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
            Create a business and a missed-call workflow first — the simulator runs your real, saved workflows so every captured call lands in your dashboard.
          </p>
          <Link href="/workflows/new" className="btn-primary" style={{ display: 'inline-flex', gap: '8px' }}>
            <PlusCircle size={15} /> Create a Workflow
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container" style={{ maxWidth: '100%', padding: '24px 32px' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="page-title">Voice AI Personal Assistant Simulator</h1>
            <span className="badge badge-completed">Voice-First Agent</span>
          </div>
          <p className="page-subtitle">
            Simulate missed-call AI conversations — real-time spoken voice (ElevenLabs + Deepgram) with Google Calendar tool calling & order tracking
          </p>
        </div>

        {/* Mode Selector & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            background: 'var(--bg-elevated)',
            padding: '3px',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              onClick={() => { setSimulatorMode('voice'); resetConversation() }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                background: simulatorMode === 'voice' ? 'var(--green)' : 'transparent',
                color: simulatorMode === 'voice' ? '#000' : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              <Mic size={13} /> Live Voice Call (Phone Mode)
            </button>
            <button
              onClick={() => { setSimulatorMode('chat'); resetConversation() }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                background: simulatorMode === 'chat' ? 'var(--green)' : 'transparent',
                color: simulatorMode === 'chat' ? '#000' : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              <Volume2 size={13} /> Chat & Spoken Voice
            </button>
          </div>

          {messages.length > 1 && (
            <button onClick={saveConversation} disabled={saving || saved} className="btn-primary" style={{ fontSize: '12px', padding: '8px 14px' }}>
              <Save size={13} /> {saved ? 'Saved' : saving ? 'Saving…' : 'Save to Records'}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', minHeight: '620px' }}>

        {/* Left Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>

          {/* Workflow Picker */}
          <div className="glass-card" style={{ padding: '16px' }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--green)', marginBottom: '8px' }}>
              Active Missed-Call Workflow
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
                  {wf.business?.name ? `${wf.business.name} — ` : ''}{wf.name}
                </option>
              ))}
            </select>

            {selectedWorkflow && (
              <div style={{ marginTop: '10px', padding: '10px', borderRadius: '8px', background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', fontSize: '11px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, color: '#fff' }}>{selectedWorkflow.business?.name || 'Business'}</span>
                  <span className={cn('badge', isHindi ? 'badge-pending' : 'badge-new')} style={{ fontSize: '10px' }}>
                    {isHindi ? 'Hindi (हिंदी)' : 'English'}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)' }}>
                  Trigger: Missed Call &middot; {selectedWorkflow.fields?.length || 0} fields to capture
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
              Quick Test Triggers
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {QUICK_SCENARIOS.map(s => (
                <button
                  key={s.label}
                  onClick={() => {
                    if (simulatorMode === 'voice') {
                      sendMessage(s.text)
                    } else {
                      if (!started) {
                        startConversation()
                        setTimeout(() => sendMessage(s.text), 400)
                      } else {
                        sendMessage(s.text)
                      }
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

          {/* Captured Fields */}
          {selectedWorkflow?.fields && selectedWorkflow.fields.length > 0 && (
            <div className="glass-card" style={{ padding: '16px' }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--green)', marginBottom: '8px' }}>
                Captured Information
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {selectedWorkflow.fields.map(field => {
                  const has = field.key in collectedData
                  return (
                    <div key={field.key} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '6px 8px', borderRadius: '6px', fontSize: '11px',
                      background: has ? 'rgba(16,185,129,0.08)' : 'var(--bg-inset)',
                      border: `1px solid ${has ? 'rgba(16,185,129,0.25)' : 'var(--border-subtle)'}`
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: has ? 'var(--green-bright)' : 'var(--text-muted)' }}>
                        {has ? <CheckCircle2 size={11} /> : <div style={{ width: 10, height: 10, borderRadius: '50%', border: '1px solid var(--border)' }} />}
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

          {/* Calendar Tool Result */}
          {calendarEvent.id && (
            <div className="glass-card" style={{ padding: '16px', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--green)', marginBottom: '8px' }}>
                <Calendar size={11} /> Calendar Event Created
              </label>
              <p style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-muted)', wordBreak: 'break-all' }}>ID: {calendarEvent.id}</p>
              {calendarEvent.url && (
                <a href={calendarEvent.url} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 600 }}>
                  Open in Google Calendar →
                </a>
              )}
            </div>
          )}

          {/* Tool Logs */}
          {toolLogs.length > 0 && (
            <div className="glass-card" style={{ padding: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--green)', marginBottom: '8px' }}>
                <Sparkles size={11} /> Agent Tool Executions
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

        {/* Right — Main Voice Simulator Interface */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '560px' }}>

          {/* Render Mode: Voice Phone Call Mode (Primary) */}
          {simulatorMode === 'voice' && selectedWorkflow && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', gap: '16px' }}>
              <ElevenLabsVoiceSimulator
                key={selectedWorkflow.id}
                workflow={selectedWorkflow}
                messages={messages}
                onMessage={msg => setMessages(prev => [...prev, msg])}
                onToolLog={log => setToolLogs(prev => [...prev, log])}
                onData={(collected, calendar) => {
                  if (collected && Object.keys(collected).length) setCollectedData(prev => ({ ...prev, ...collected }))
                  if (calendar?.id) setCalendarEvent(calendar)
                }}
                onEnd={() => {
                  toast.success('Voice call ended')
                }}
              />

              {/* In-Call Transcript Scroll Box */}
              <div style={{
                flex: 1, maxHeight: '240px', overflowY: 'auto',
                padding: '12px 16px', borderRadius: '12px',
                background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)',
                display: 'flex', flexDirection: 'column', gap: '8px'
              }}>
                <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Live Conversation Transcript:
                </p>
                {messages.map(m => (
                  <div key={m.id} style={{ fontSize: '12px', display: 'flex', gap: '6px' }}>
                    <span style={{ fontWeight: 600, color: m.role === 'assistant' ? 'var(--green)' : '#60a5fa', flexShrink: 0 }}>
                      {m.role === 'assistant' ? 'Voice AI:' : 'Caller:'}
                    </span>
                    <span style={{ color: '#e4e4e7', lineHeight: 1.4 }}>{m.content}</span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          {/* Render Mode: Chat & Audio Mode */}
          {simulatorMode === 'chat' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Chat Subheader */}
              <div style={{
                padding: '12px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--bg-elevated)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Volume2 size={16} className="text-emerald-400" />
                  <span style={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}>
                    Spoken Audio Chat Mode
                  </span>
                </div>
                <button
                  onClick={() => { if (autoSpeak) stopAudio(); setAutoSpeak(!autoSpeak) }}
                  style={{
                    fontSize: '11px', padding: '4px 10px', borderRadius: '6px',
                    background: autoSpeak ? 'rgba(16,185,129,0.15)' : 'var(--bg-inset)',
                    border: `1px solid ${autoSpeak ? 'var(--green)' : 'var(--border)'}`,
                    color: autoSpeak ? 'var(--green)' : 'var(--text-muted)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
                  }}
                >
                  {autoSpeak ? <><Volume2 size={12} /> Auto-Speak: ON</> : <><VolumeX size={12} /> Audio: OFF</>}
                </button>
              </div>

              {/* TTS Notification banner */}
              {ttsError && (
                <div style={{
                  padding: '8px 20px', fontSize: '11px',
                  color: ttsError.includes('Playing') ? '#93c5fd' : '#fca5a5',
                  background: ttsError.includes('Playing') ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.08)',
                  borderBottom: `1px solid ${ttsError.includes('Playing') ? 'rgba(59,130,246,0.25)' : 'rgba(239,68,68,0.2)'}`,
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                  {ttsError.includes('Playing') ? <Volume2 size={12} className="text-blue-400" /> : <VolumeX size={12} />} {ttsError}
                </div>
              )}

              {/* Chat Messages */}
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
                      Start Chat Simulation
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px', maxWidth: '320px' }}>
                      Test conversation logic, data capture, urgency flags, and Google Calendar tool calling.
                    </p>
                    <button
                      id="start-simulation-btn"
                      onClick={startConversation}
                      className="btn-primary"
                      style={{ justifyContent: 'center', gap: '8px', fontSize: '13px', padding: '10px 24px' }}
                    >
                      <Phone size={14} /> Start Call Simulation
                    </button>
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
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <p style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>
                              {msg.role === 'user' ? 'Caller' : 'AI Assistant'}
                            </p>
                            {msg.role === 'assistant' && !msg.isLoading && (
                              <button
                                onClick={() => speakViaTts(msg.content, selectedWorkflow?.language)}
                                style={{ background: 'none', border: 'none', color: 'var(--green)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px' }}
                                title="Listen to spoken audio"
                              >
                                <Volume2 size={11} /> Speak
                              </button>
                            )}
                          </div>
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

              {/* Input Bar in Chat Mode */}
              {started && (
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
                    {isHindi ? 'हिंदी और English दोनों में बात कर सकते हैं' : 'Try: "Book appointment tomorrow 4PM" or "Track order ORD-101"'} &nbsp;&middot;&nbsp; Model-native tool calling
                  </p>
                </div>
              )}
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
