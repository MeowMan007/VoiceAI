'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Mic, MicOff, Volume2, PhoneOff, Loader2 } from 'lucide-react'
import { Workflow, SimulatorMessage } from '@/types'
import { v4 as uuidv4 } from 'uuid'

interface Props {
  workflow: Workflow
  onMessage: (msg: SimulatorMessage) => void
  onEnd: () => void
  onToolLog: (log: string) => void
  messages: SimulatorMessage[]
}

type ConnectionState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error'

export default function ElevenLabsVoiceSimulator({
  workflow,
  onMessage,
  onEnd,
  onToolLog,
  messages,
}: Props) {
  const [state, setState] = useState<ConnectionState>('idle')
  const [transcript, setTranscript] = useState('')
  const [micActive, setMicActive] = useState(false)

  const deepgramWsRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isStartedRef = useRef(false)

function getSavedVoiceKeys() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem('voiceai_business_settings')
    if (!raw) return {}
    return JSON.parse(raw) as {
      deepgramApiKey?: string
      elevenlabsApiKey?: string
      openaiApiKey?: string
    }
  } catch {
    return {}
  }
}

  // Play TTS audio for assistant message
  const speakText = useCallback(async (text: string) => {
    setState('speaking')
    try {
      const keys = getSavedVoiceKeys()
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          language: workflow.language,
          apiKey: keys.elevenlabsApiKey,
        }),
      })

      if (!response.ok) {
        // ElevenLabs not configured — show text only
        setState('listening')
        return
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio

      audio.onended = () => {
        URL.revokeObjectURL(url)
        setState('listening')
      }
      audio.onerror = () => {
        setState('listening')
      }
      await audio.play()
    } catch {
      setState('listening')
    }
  }, [workflow.language])

  // Send accumulated transcript to /api/chat and speak the response
  const sendToChat = useCallback(async (userText: string) => {
    if (!userText.trim()) return
    setState('thinking')

    // Add user message
    const userMsg: SimulatorMessage = {
      id: uuidv4(),
      role: 'user',
      content: userText.trim(),
      timestamp: new Date(),
    }
    onMessage(userMsg)

    try {
      const bizName = (workflow.business as { name?: string })?.name || 'our business'
      const calendarToken = typeof window !== 'undefined'
        ? localStorage.getItem('voiceai_google_token') || undefined
        : undefined

      const chatMessages = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userText.trim() },
      ]

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatMessages,
          workflow: { ...workflow, business: { name: bizName } },
          calendarAccessToken: calendarToken,
          aiConfig: { provider: 'gemini' },
        }),
      })

      const data = await response.json()
      const assistantText: string = data.message || "I'm sorry, I couldn't process that."

      if (data.toolUsed) {
        onToolLog(`Tool: ${data.toolUsed.replace(/_/g, ' ')}`)
      }

      const assistantMsg: SimulatorMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: assistantText,
        timestamp: new Date(),
      }
      onMessage(assistantMsg)
      await speakText(assistantText)
    } catch {
      setState('listening')
      toast.error('Failed to get AI response')
    }
  }, [messages, workflow, onMessage, onToolLog, speakText])

  // Connect to Deepgram for STT
  const connectDeepgram = useCallback(async () => {
    try {
      setState('connecting')
      // Get mic access first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream

      // Get Deepgram token from backend (passing saved key if present)
      const keys = getSavedVoiceKeys()
      const tokenUrl = keys.deepgramApiKey
        ? `/api/deepgram-token?key=${encodeURIComponent(keys.deepgramApiKey)}`
        : '/api/deepgram-token'
      const tokenRes = await fetch(tokenUrl)
      const { key: dgKey } = await tokenRes.json()

      if (!dgKey) {
        toast.error('Deepgram API key not configured. Add it in Settings → Voice Keys or .env.local')
        setState('error')
        onEnd()
        return
      }

      const lang = workflow.language === 'hi' ? 'hi' : 'en-US'
      const ws = new WebSocket(
        `wss://api.deepgram.com/v1/listen?language=${lang}&model=nova-2&interim_results=true&endpointing=800`,
        ['token', dgKey]
      )
      deepgramWsRef.current = ws

      ws.onopen = () => {
        setState('listening')
        setMicActive(true)

        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
        mediaRecorderRef.current = recorder

        recorder.ondataavailable = (e) => {
          if (ws.readyState === WebSocket.OPEN && e.data.size > 0) {
            ws.send(e.data)
          }
        }
        recorder.start(250)
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        const alt = data?.channel?.alternatives?.[0]
        if (!alt) return

        const text: string = alt.transcript || ''
        const isFinal: boolean = data.is_final

        if (text) setTranscript(text)

        if (isFinal && text.trim()) {
          // Clear silence timer and send after a short pause
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
          silenceTimerRef.current = setTimeout(() => {
            setTranscript('')
            sendToChat(text)
          }, 700)
        }
      }

      ws.onerror = () => {
        toast.error('Deepgram connection error. Check your API key.')
        setState('error')
        onEnd()
      }

      ws.onclose = () => {
        setMicActive(false)
      }
    } catch (err) {
      if ((err as Error).name === 'NotAllowedError') {
        toast.error('Microphone access denied. Please allow microphone in browser settings.')
      } else {
        toast.error('Failed to start voice session')
      }
      setState('error')
      onEnd()
    }
  }, [workflow.language, sendToChat, onEnd])

  const stopSession = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (deepgramWsRef.current) {
      deepgramWsRef.current.close()
      deepgramWsRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setMicActive(false)
    setState('idle')
    onEnd()
  }, [onEnd])

  // Speak greeting on mount then connect STT
  useEffect(() => {
    if (isStartedRef.current) return
    isStartedRef.current = true

    const bizName = (workflow.business as { name?: string })?.name || 'our business'
    const greeting = workflow.greeting.replace(/\[Business Name\]/g, bizName)

    const assistantMsg: SimulatorMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: greeting,
      timestamp: new Date(),
    }
    onMessage(assistantMsg)

    speakText(greeting).then(() => {
      connectDeepgram()
    })

    return () => {
      stopSession()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stateLabel: Record<ConnectionState, string> = {
    idle: 'Initializing…',
    connecting: 'Connecting mic…',
    listening: 'Listening — speak now',
    thinking: 'AI thinking…',
    speaking: 'Assistant speaking…',
    error: 'Connection error',
  }

  const stateColor: Record<ConnectionState, string> = {
    idle: 'var(--text-muted)',
    connecting: '#f59e0b',
    listening: 'var(--green)',
    thinking: '#60a5fa',
    speaking: '#a78bfa',
    error: '#f87171',
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      padding: '20px',
      background: 'var(--bg-inset)',
      borderRadius: '16px',
      border: '1px solid var(--border-subtle)',
    }}>
      {/* Status indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: stateColor[state],
          boxShadow: state === 'listening' ? `0 0 8px ${stateColor[state]}` : 'none',
          animation: state === 'listening' ? 'pulse 1.5s infinite' : 'none',
          transition: 'background 0.3s',
        }} />
        <span style={{ fontSize: '12px', color: stateColor[state], fontWeight: 500 }}>
          {stateLabel[state]}
        </span>
      </div>

      {/* Animated mic orb */}
      <div style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: state === 'listening'
          ? 'radial-gradient(circle, rgba(16,185,129,0.25) 0%, rgba(16,185,129,0.05) 100%)'
          : state === 'speaking'
          ? 'radial-gradient(circle, rgba(167,139,250,0.25) 0%, rgba(167,139,250,0.05) 100%)'
          : 'var(--bg-elevated)',
        border: `2px solid ${state === 'listening' ? 'var(--green)' : state === 'speaking' ? '#a78bfa' : 'var(--border-subtle)'}`,
        transition: 'all 0.3s',
      }}>
        {state === 'thinking' || state === 'connecting' ? (
          <Loader2 size={28} style={{ color: '#60a5fa', animation: 'spin 1s linear infinite' }} />
        ) : state === 'speaking' ? (
          <Volume2 size={28} style={{ color: '#a78bfa' }} />
        ) : micActive ? (
          <Mic size={28} style={{ color: 'var(--green)' }} />
        ) : (
          <MicOff size={28} style={{ color: 'var(--text-muted)' }} />
        )}
      </div>

      {/* Live transcript */}
      {transcript && (
        <div style={{
          maxWidth: '100%',
          padding: '8px 14px',
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: '10px',
          fontSize: '13px',
          color: 'var(--text-secondary)',
          fontStyle: 'italic',
          textAlign: 'center',
        }}>
          &ldquo;{transcript}&rdquo;
        </div>
      )}

      {/* Provider badges */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <span style={{
          fontSize: '10px',
          padding: '3px 8px',
          borderRadius: '6px',
          background: 'rgba(96,165,250,0.1)',
          border: '1px solid rgba(96,165,250,0.2)',
          color: '#60a5fa',
          fontWeight: 600,
        }}>
          🎙 Deepgram STT
        </span>
        <span style={{
          fontSize: '10px',
          padding: '3px 8px',
          borderRadius: '6px',
          background: 'rgba(167,139,250,0.1)',
          border: '1px solid rgba(167,139,250,0.2)',
          color: '#a78bfa',
          fontWeight: 600,
        }}>
          🔊 ElevenLabs TTS
        </span>
        <span style={{
          fontSize: '10px',
          padding: '3px 8px',
          borderRadius: '6px',
          background: 'rgba(16,185,129,0.1)',
          border: '1px solid rgba(16,185,129,0.2)',
          color: 'var(--green)',
          fontWeight: 600,
        }}>
          🤖 Google Gemini
        </span>
      </div>

      {/* End call button */}
      <button
        onClick={stopSession}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 20px',
          borderRadius: '10px',
          background: 'rgba(248,113,113,0.1)',
          border: '1px solid rgba(248,113,113,0.3)',
          color: '#f87171',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 600,
        }}
      >
        <PhoneOff size={13} /> End Voice Call
      </button>
    </div>
  )
}
