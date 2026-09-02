'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Calendar, Webhook, ShieldCheck, CheckCircle2,
  Copy, Smartphone, Sparkles, ExternalLink, KeyRound
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
    toast.success('Copied to clipboard')
    setTimeout(() => setCopiedWebhook(false), 2000)
  }

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/vapi/webhook`
    : 'https://your-domain.com/api/vapi/webhook'

  return (
    <div className="p-8 lg:p-10 max-w-5xl w-full mx-auto space-y-8">
      <div className="border-b border-zinc-800 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white font-display">Settings & Integrations</h1>
        <p className="text-sm text-zinc-400 mt-1.5">
          Configure Google Gemini AI, Google Calendar OAuth, and voice assistant endpoints.
        </p>
      </div>

      {/* Google Gemini AI Provider Card */}
      <div className="glass-card p-6 space-y-5 border-emerald-500/30 bg-emerald-950/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-semibold text-sm text-white">Google Gemini AI Engine (Recommended)</h3>
                <span className="badge badge-completed text-[10px]">Active Provider</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed max-w-2xl">
                Supports Google Gemini 1.5 Flash natively. If you have a Google account or Gemini Plus subscription, you can generate a free API key in seconds without an OpenAI subscription.
              </p>
            </div>
          </div>

          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="btn-primary text-xs py-2 px-3.5 inline-flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            Get Free Gemini Key <ExternalLink size={13} />
          </a>
        </div>

        <div className="pt-3 border-t border-zinc-800/80 text-xs text-zinc-400 space-y-2">
          <p className="flex items-center gap-2">
            <KeyRound size={13} className="text-emerald-400" />
            <span>Add <code className="text-emerald-400 bg-zinc-900 px-1.5 py-0.5 rounded font-mono">GEMINI_API_KEY=your_key</code> in your <code className="text-white">.env.local</code> file.</span>
          </p>
          <p className="text-zinc-500 text-[11px]">
            No API key? The assistant also features an autonomous simulation engine that executes realistic tool calling, Google Calendar bookings, and order lookups without any external billing required.
          </p>
        </div>
      </div>

      {/* Google Calendar Integration Card */}
      <div className="glass-card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shrink-0">
              <Calendar size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-semibold text-sm text-white">Google Calendar Agent Integration</h3>
                {googleConnected ? (
                  <span className="badge badge-completed">Connected</span>
                ) : (
                  <span className="badge badge-pending">Ready to Link</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed max-w-2xl">
                Allows your Voice AI assistant to check slot availability, create new appointments, and reschedule or cancel events during customer calls.
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {googleConnected ? (
              <button
                type="button"
                onClick={() => {
                  setGoogleConnected(false)
                  toast.success('Disconnected from Google Calendar')
                }}
                className="btn-secondary text-xs text-rose-400 hover:text-rose-300 py-2 px-3.5"
              >
                Disconnect
              </button>
            ) : (
              <a
                href="/api/auth/google"
                className="btn-secondary text-xs py-2 px-3.5 inline-flex items-center gap-1.5"
              >
                <Calendar size={13} />
                Connect Google Account
              </a>
            )}
          </div>
        </div>

        {/* 4 Tool functions */}
        <div className="pt-3 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
            <p className="font-medium text-white text-[11px]">1. Check Slot</p>
            <p className="font-mono text-[10px] text-zinc-500 truncate mt-0.5">check_calendar_availability</p>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
            <p className="font-medium text-white text-[11px]">2. Book Event</p>
            <p className="font-mono text-[10px] text-zinc-500 truncate mt-0.5">create_calendar_event</p>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
            <p className="font-medium text-white text-[11px]">3. Reschedule</p>
            <p className="font-mono text-[10px] text-zinc-500 truncate mt-0.5">update_calendar_event</p>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
            <p className="font-medium text-white text-[11px]">4. Cancel</p>
            <p className="font-mono text-[10px] text-zinc-500 truncate mt-0.5">delete_calendar_event</p>
          </div>
        </div>
      </div>

      {/* REST API Tool Card */}
      <div className="glass-card p-6 space-y-3">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shrink-0">
            <Smartphone size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-semibold text-sm text-white">Delivery & Order Status API Tool</h3>
              <span className="badge badge-completed text-[10px]">Active Agent Tool</span>
            </div>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              Autonomous REST API tool calling. Callers stating an Order or Tracking ID (e.g. <code className="text-emerald-400 bg-zinc-900 px-1.5 py-0.5 rounded font-mono">ORD-101</code>, <code className="text-emerald-400 bg-zinc-900 px-1.5 py-0.5 rounded font-mono">TRK-902</code>) trigger the assistant to query live dispatch status dynamically.
            </p>
          </div>
        </div>
      </div>

      {/* Voice Webhook URL */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shrink-0">
            <Webhook size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white">Voice AI Webhook Endpoint (Vapi / Twilio)</h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Use this webhook URL in your telephony provider or Vapi dashboard to stream call transcripts and trigger function tools.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <input
            type="text"
            readOnly
            value={webhookUrl}
            className="input-field text-xs font-mono bg-black py-2.5"
          />
          <button
            type="button"
            onClick={() => copyToClipboard(webhookUrl)}
            className="btn-secondary text-xs flex items-center gap-1.5 py-2.5 px-3.5 shrink-0"
          >
            {copiedWebhook ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
            {copiedWebhook ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Environment & Fallback Status */}
      <div className="glass-card p-6 space-y-3">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white">Offline & Autonomous Operation</h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              The application is configured to run smoothly in production with live Google Gemini or OpenAI keys, and includes an autonomous simulation engine that executes realistic tool calling even without external API credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="p-16 text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-zinc-400">Loading settings...</p>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}
