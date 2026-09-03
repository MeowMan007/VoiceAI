'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Mic, MicOff, Volume2, PhoneOff, Loader2, Sparkles, Phone, PhoneCall } from 'lucide-react'
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
  const [micMuted, setMicMuted] = useState(false)
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [callDuration, setCallDuration] = useState(0)

  const deepgramWsRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isStartedRef = useRef(false)

  // Call duration timer
  useEffect(() => {
    callTimerRef.current = setInterval(() => {
      setCallDuration(d => d + 1)
    }, 1000)
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current)
    }
  }, [])

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  function getSavedVoiceKeys() {
    if (typeof window === 'undefined') return {}
    try {
      const raw = localStorage.getItem('voiceai_business_settings')
      if (!raw) return {}
      return JSON.parse(raw) as {
        deepgramApiKey?: string
        elevenlabsApiKey?: string
      }
    } catch {
      return {}
    }
  }

  // Play natural browser speech synthesis
  const playSpeechSynthesis = useCallback((text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = workflow.language === 'hi' ? 'hi-IN' : 'en-US'
      utterance.rate = 1.02
      utterance.pitch = 1.0

      const voices = window.speechSynthesis.getVoices()
      const preferredVoice = voices.find(v =>
        workflow.language === 'hi'
          ? (v.lang.includes('hi') || v.name.includes('Hindi'))
          : (v.lang.includes('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Zira') || v.name.includes('David')))
      )
      if (preferredVoice) utterance.voice = preferredVoice

      utterance.onstart = () => {
        setState('speaking')
      }
      utterance.onend = () => {
        setState('listening')
      }
      utterance.onerror = () => {
        setState('listening')
      }
      window.speechSynthesis.speak(utterance)
    } else {
      setState('listening')
    }
  }, [workflow.language])

  // Play TTS audio for assistant message (ElevenLabs + WebSpeech fallback)
  const speakText = useCallback(async (text: string) => {
    setState('speaking')
    let played = false

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

      if (response.ok) {
        const blob = await response.blob()
        if (blob.size > 200) {
          const url = URL.createObjectURL(blob)
          const audio = new Audio(url)
          audioRef.current = audio

          audio.onended = () => {
            URL.revokeObjectURL(url)
            setState('listening')
          }
          audio.onerror = () => {
            playSpeechSynthesis(text)
          }
          await audio.play()
          played = true
        }
      }
    } catch {
      // Fallback
    }

    if (!played) {
      playSpeechSynthesis(text)
    }
  }, [workflow.language, playSpeechSynthesis])

  // Send accumulated transcript to /api/chat and speak the response
  const sendToChat = useCallback(async (userText: string) => {
    if (!userText.trim()) return
    setState('thinking')

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
      const assistantText: string = data.message || "I have recorded your request. Is there anything else you need?"

      if (data.toolUsed) {
        const toolLabel = data.toolUsed === 'create_calendar_event'
          ? '📅 Google Calendar: Appointment Booked'
          : data.toolUsed === 'lookup_delivery_status'
          ? '📦 Delivery API: Package Status Checked'
          : `⚡ Tool Executed: ${data.toolUsed}`
        setActiveTool(toolLabel)
        onToolLog(toolLabel)
        setTimeout(() => setActiveTool(null), 6000)
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
      toast.error('AI response error')
    }
  }, [messages, workflow, onMessage, onToolLog, speakText])

  // Fallback to browser SpeechRecognition
  const startWebSpeechFallback = useCallback(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const rec = new SpeechRec()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = workflow.language === 'hi' ? 'hi-IN' : 'en-US'

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (event: any) => {
        if (micMuted) return
        let interim = ''
        let final = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript
          } else {
            interim += event.results[i][0].transcript
          }
        }
        if (interim) setTranscript(interim)
        if (final.trim()) {
          setTranscript('')
          sendToChat(final.trim())
        }
      }

      rec.onstart = () => {
        setState('listening')
      }
      rec.onerror = () => {
        setState('listening')
      }
      rec.onend = () => {
        if (isStartedRef.current && state !== 'speaking' && state !== 'thinking') {
          try { rec.start() } catch { /* ignore */ }
        }
      }
      try { rec.start() } catch { /* ignore */ }
    } else {
      setState('listening')
    }
  }, [workflow.language, sendToChat, micMuted, state])

  // Connect to Deepgram or browser WebSpeech for STT
  const connectDeepgram = useCallback(async () => {
    try {
      setState('connecting')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream

      const keys = getSavedVoiceKeys()
      const tokenUrl = keys.deepgramApiKey
        ? `/api/deepgram-token?key=${encodeURIComponent(keys.deepgramApiKey)}`
        : '/api/deepgram-token'

      let dgKey = ''
      try {
        const tokenRes = await fetch(tokenUrl)
        if (tokenRes.ok) {
          const json = await tokenRes.json()
          dgKey = json.key
        }
      } catch { /* ignore */ }

      if (dgKey && !dgKey.startsWith('your_')) {
        const lang = workflow.language === 'hi' ? 'hi' : 'en-US'
        const ws = new WebSocket(
          `wss://api.deepgram.com/v1/listen?language=${lang}&model=nova-2&interim_results=true&endpointing=600`,
          ['token', dgKey]
        )
        deepgramWsRef.current = ws

        ws.onopen = () => {
          setState('listening')
          const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
          mediaRecorderRef.current = recorder

          recorder.ondataavailable = (e) => {
            if (ws.readyState === WebSocket.OPEN && e.data.size > 0 && !micMuted) {
              ws.send(e.data)
            }
          }
          recorder.start(250)
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            const alt = data?.channel?.alternatives?.[0]
            if (!alt) return

            const text: string = alt.transcript || ''
            const isFinal: boolean = data.is_final

            if (text && !micMuted) setTranscript(text)

            if (isFinal && text.trim() && !micMuted) {
              if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
              silenceTimerRef.current = setTimeout(() => {
                setTranscript('')
                sendToChat(text)
              }, 600)
            }
          } catch { /* ignore */ }
        }

        ws.onerror = () => {
          startWebSpeechFallback()
        }
      } else {
        startWebSpeechFallback()
      }
    } catch (err) {
      if ((err as Error).name === 'NotAllowedError') {
        toast.error('Microphone access denied. You can speak using the Quick Buttons below!')
      }
      startWebSpeechFallback()
    }
  }, [workflow.language, sendToChat, micMuted, startWebSpeechFallback])

  const stopSession = useCallback(() => {
    if (callTimerRef.current) clearInterval(callTimerRef.current)
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
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
    idle: 'Connecting Call…',
    connecting: 'Connecting Microphone…',
    listening: '🎙️ Listening to you (Speak now)',
    thinking: '🤖 AI Reasoning & Tool Calling…',
    speaking: '🔊 Assistant Speaking Out Loud…',
    error: 'Call Error',
  }

  const stateColor: Record<ConnectionState, string> = {
    idle: '#a1a1aa',
    connecting: '#f59e0b',
    listening: '#10b981',
    thinking: '#3b82f6',
    speaking: '#8b5cf6',
    error: '#f87171',
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px',
      padding: '28px 24px',
      background: 'linear-gradient(180deg, rgba(16,185,129,0.06) 0%, rgba(10,10,10,0.95) 100%)',
      borderRadius: '20px',
      border: '1px solid rgba(16,185,129,0.25)',
      boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
      width: '100%',
    }}>
      {/* Top Banner: In-Call Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(16,185,129,0.15)',
            border: '1px solid var(--green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--green)'
          }}>
            <PhoneCall size={16} />
          </div>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
              {(workflow.business as { name?: string })?.name || 'Voice AI Assistant'}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--green)', fontFamily: 'monospace' }}>
              ● LIVE CALL IN PROGRESS &middot; {formatDuration(callDuration)}
            </p>
          </div>
        </div>

        {/* Status indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 12px', borderRadius: '20px',
          background: 'rgba(0,0,0,0.4)', border: `1px solid ${stateColor[state]}44`
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: stateColor[state],
            boxShadow: `0 0 8px ${stateColor[state]}`,
            animation: state === 'speaking' || state === 'listening' ? 'pulse 1.2s infinite' : 'none',
          }} />
          <span style={{ fontSize: '11px', color: stateColor[state], fontWeight: 600 }}>
            {stateLabel[state]}
          </span>
        </div>
      </div>

      {/* Tool Call Notification Banner */}
      {activeTool && (
        <div style={{
          width: '100%',
          padding: '10px 16px',
          borderRadius: '12px',
          background: 'linear-gradient(90deg, rgba(16,185,129,0.2) 0%, rgba(59,130,246,0.2) 100%)',
          border: '1px solid var(--green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          color: '#fff', fontSize: '12px', fontWeight: 600,
          animation: 'bounce 0.5s ease'
        }}>
          <Sparkles size={14} className="text-yellow-400" />
          <span>{activeTool}</span>
        </div>
      )}

      {/* Center 3D Voice Orb with Sound Ripples */}
      <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '10px 0' }}>
        {/* Outer Ripple 1 */}
        <div style={{
          position: 'absolute',
          inset: state === 'speaking' ? -18 : state === 'listening' ? -10 : -4,
          borderRadius: '50%',
          background: state === 'speaking' ? 'rgba(139,92,246,0.15)' : 'rgba(16,185,129,0.15)',
          transition: 'all 0.4s ease',
          animation: state === 'speaking' || state === 'listening' ? 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' : 'none'
        }} />

        {/* Outer Ripple 2 */}
        <div style={{
          position: 'absolute',
          inset: state === 'speaking' ? -8 : -2,
          borderRadius: '50%',
          border: `2px dashed ${state === 'speaking' ? '#8b5cf6' : 'var(--green)'}`,
          opacity: 0.5,
          animation: 'spin 12s linear infinite'
        }} />

        {/* Inner Voice Core Orb */}
        <div style={{
          width: 100, height: 100, borderRadius: '50%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: state === 'speaking'
            ? 'radial-gradient(circle, #8b5cf6 0%, #6d28d9 100%)'
            : state === 'listening'
            ? 'radial-gradient(circle, #10b981 0%, #047857 100%)'
            : state === 'thinking'
            ? 'radial-gradient(circle, #3b82f6 0%, #1d4ed8 100%)'
            : 'radial-gradient(circle, #374151 0%, #1f2937 100%)',
          boxShadow: state === 'speaking'
            ? '0 0 35px rgba(139,92,246,0.8)'
            : state === 'listening'
            ? '0 0 35px rgba(16,185,129,0.8)'
            : '0 0 20px rgba(0,0,0,0.5)',
          color: '#fff',
          transition: 'all 0.3s ease',
          zIndex: 2,
        }}>
          {state === 'thinking' || state === 'connecting' ? (
            <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
          ) : state === 'speaking' ? (
            <Volume2 size={36} className="animate-pulse" />
          ) : !micMuted ? (
            <Mic size={36} />
          ) : (
            <MicOff size={36} style={{ color: '#f87171' }} />
          )}
        </div>
      </div>

      {/* Audio Waveform Visualizer Bars (Simulated audio activity) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '24px' }}>
        {[12, 24, 18, 28, 16, 26, 14, 22, 10, 20, 15].map((h, i) => (
          <div
            key={i}
            style={{
              width: '3px',
              height: state === 'speaking' ? `${h}px` : state === 'listening' ? `${Math.max(6, h / 2)}px` : '4px',
              borderRadius: '2px',
              background: state === 'speaking' ? '#a78bfa' : state === 'listening' ? 'var(--green)' : 'var(--border)',
              transition: 'height 0.15s ease, background 0.3s',
            }}
          />
        ))}
      </div>

      {/* Real-time Transcription Display */}
      <div style={{ width: '100%', minHeight: '38px', textAlign: 'center' }}>
        {transcript ? (
          <p style={{
            fontSize: '13px', color: '#fff', fontStyle: 'italic',
            background: 'rgba(16,185,129,0.12)', padding: '6px 14px', borderRadius: '10px',
            border: '1px solid rgba(16,185,129,0.3)', display: 'inline-block'
          }}>
            &ldquo;{transcript}&rdquo;
          </p>
        ) : (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {state === 'speaking'
              ? '🗣️ Assistant is speaking out loud through your speakers…'
              : state === 'thinking'
              ? '⚡ AI is reasoning and executing tools…'
              : '🎙️ Speak clearly into your microphone, or tap a quick response below:'}
          </p>
        )}
      </div>

      {/* Quick Test Voice Triggers (Allows 1-tap speech simulation) */}
      <div style={{ width: '100%' }}>
        <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '6px', textAlign: 'center' }}>
          Tap to Speak Sentence directly:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
          {[
            'I need a 1kg chocolate truffle cake tomorrow',
            'Schedule a callback tomorrow at 4 PM',
            'Can you track order ORD-101?',
            'कल शाम तक 2 किलो केक चाहिए'
          ].map(phrase => (
            <button
              key={phrase}
              onClick={() => sendToChat(phrase)}
              disabled={state === 'speaking' || state === 'thinking'}
              style={{
                fontSize: '11px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#e4e4e7',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              💬 &ldquo;{phrase}&rdquo;
            </button>
          ))}
        </div>
      </div>

      {/* In-Call Controls */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px',
        paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', width: '100%'
      }}>
        {/* Mute Mic */}
        <button
          onClick={() => {
            setMicMuted(!micMuted)
            toast.success(micMuted ? 'Microphone unmuted' : 'Microphone muted')
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 18px', borderRadius: '12px',
            background: micMuted ? 'rgba(239,68,68,0.15)' : 'var(--bg-elevated)',
            border: `1px solid ${micMuted ? '#f87171' : 'var(--border-subtle)'}`,
            color: micMuted ? '#f87171' : '#fff',
            cursor: 'pointer', fontSize: '12px', fontWeight: 600
          }}
        >
          {micMuted ? <MicOff size={15} /> : <Mic size={15} />}
          {micMuted ? 'Unmute Mic' : 'Mute Mic'}
        </button>

        {/* End Call Button */}
        <button
          onClick={stopSession}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 22px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: '#fff', border: 'none', cursor: 'pointer',
            fontSize: '12px', fontWeight: 700,
            boxShadow: '0 4px 14px rgba(239,68,68,0.4)'
          }}
        >
          <PhoneOff size={15} /> End Call
        </button>
      </div>

      {/* Tech Stack Indicator */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', opacity: 0.8 }}>
        <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(96,165,250,0.15)', color: '#60a5fa', fontWeight: 600 }}>
          🎙 Deepgram STT
        </span>
        <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(167,139,250,0.15)', color: '#a78bfa', fontWeight: 600 }}>
          🔊 ElevenLabs Neural Voice
        </span>
        <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(16,185,129,0.15)', color: 'var(--green)', fontWeight: 600 }}>
          🤖 Google Gemini 1.5/2.5 Flash
        </span>
      </div>
    </div>
  )
}
