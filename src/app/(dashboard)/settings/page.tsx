'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Calendar, Key, Webhook, ShieldCheck, CheckCircle2,
  ExternalLink, Copy, RefreshCw, Smartphone
} from 'lucide-react'

function SettingsContent() {
  const searchParams = useSearchParams()
  const [googleConnected, setGoogleConnected] = useState(false)
  const [copiedWebhook, setCopiedWebhook] = useState(false)

  useEffect(() => {
    if (searchParams.get('google_connected') === 'true') {
      setGoogleConnected(true)
      toast.success('Google Calendar connected successfully!')
    }
  }, [searchParams])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedWebhook(true)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopiedWebhook(false), 2000)
  }

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/vapi/webhook`
    : 'https://your-domain.com/api/vapi/webhook'

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Settings & Integrations</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Manage external services, Google Calendar connection, and voice agent configuration
        </p>
      </div>

      {/* Google Calendar Integration Card */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Calendar size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base">Google Calendar Integration</h3>
                {googleConnected ? (
                  <span className="badge badge-completed">Connected</span>
                ) : (
                  <span className="badge badge-pending">Ready to Connect</span>
                )}
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Allows your Voice AI assistant to check slot availability, create calendar events, and reschedule or cancel appointments directly during customer calls.
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {googleConnected ? (
              <button
                onClick={() => {
                  setGoogleConnected(false)
                  toast.success('Disconnected from Google Calendar')
                }}
                className="btn-secondary text-xs px-3 py-2 text-rose-400 hover:text-rose-300"
              >
                Disconnect
              </button>
            ) : (
              <a
                href="/api/auth/google"
                className="btn-primary inline-flex items-center gap-2 text-xs py-2 px-4"
              >
                <Calendar size={14} />
                Connect Google Account
              </a>
            )}
          </div>
        </div>

        {/* Calendar Tools Info */}
        <div className="mt-4 pt-4 border-t border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-white/[0.02]">
            <p className="font-medium text-zinc-300">1. Check Slot</p>
            <p className="text-[11px] text-zinc-500">check_calendar_availability</p>
          </div>
          <div className="p-2.5 rounded-lg bg-white/[0.02]">
            <p className="font-medium text-zinc-300">2. Book Event</p>
            <p className="text-[11px] text-zinc-500">create_calendar_event</p>
          </div>
          <div className="p-2.5 rounded-lg bg-white/[0.02]">
            <p className="font-medium text-zinc-300">3. Reschedule</p>
            <p className="text-[11px] text-zinc-500">update_calendar_event</p>
          </div>
          <div className="p-2.5 rounded-lg bg-white/[0.02]">
            <p className="font-medium text-zinc-300">4. Cancel</p>
            <p className="text-[11px] text-zinc-500">delete_calendar_event</p>
          </div>
        </div>
      </div>

      {/* Voice Provider & Webhook Card */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Webhook size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-base">Voice AI Webhook URL (Vapi / Twilio)</h3>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Configure this webhook URL in your Vapi or telephony dashboard to receive end-of-call events, transcripts, and function call execution.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={webhookUrl}
            className="input-field text-xs font-mono bg-black/40"
          />
          <button
            onClick={() => copyToClipboard(webhookUrl)}
            className="btn-secondary text-xs flex items-center gap-1.5 py-2.5 px-3 shrink-0"
          >
            {copiedWebhook ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
            {copiedWebhook ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Second External Tool: Order & Tracking API (Bonus requirement) */}
      <div className="glass-card p-6 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Smartphone size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base">Bonus Agent Tool: Delivery & Order Status API</h3>
              <span className="badge badge-completed">Active Agent Tool</span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Integrated REST API tool for AI voice assistant. Caller can provide an Order or Tracking ID (e.g. <code>ORD-101</code>, <code>TRK-902</code>), and the agent queries real-time status dynamically.
            </p>
          </div>
        </div>
      </div>

      {/* Environment Config Info */}
      <div className="glass-card p-6 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-500/10 border border-zinc-500/20 flex items-center justify-center text-zinc-400 shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-base">Environment & API Keys Status</h3>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              The system supports full production keys with automated graceful fallback to simulation mode for offline/demo testing.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-xs font-semibold text-purple-300">OpenAI GPT-4o</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Supports tool calling & summary</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-xs font-semibold text-blue-300">Vapi.ai Voice Web SDK</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Voice orchestrator & STT/TTS</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-xs font-semibold text-emerald-300">Supabase DB & RLS</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Multi-tenant customer records</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="p-12 text-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-zinc-400">Loading settings...</p>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}
