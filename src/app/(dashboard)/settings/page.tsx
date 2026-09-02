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
    <div className="p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-6">
      <div className="border-b border-zinc-800 pb-5">
        <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-white">Settings & Integrations</h1>
        <p className="text-xs lg:text-sm text-zinc-400 mt-1">
          Connect external services, Google Calendar OAuth, and configure voice assistant endpoints.
        </p>
      </div>

      {/* Google Calendar Integration Card */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shrink-0">
              <Calendar size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-white">Google Calendar Agent Integration</h3>
                {googleConnected ? (
                  <span className="badge badge-completed">Connected</span>
                ) : (
                  <span className="badge badge-pending">Ready to Link</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Empowers your Voice AI assistant to autonomously check slot availability, create new appointments, and reschedule or cancel events during live caller conversations.
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
                className="btn-secondary text-xs text-rose-400 hover:text-rose-300"
              >
                Disconnect
              </button>
            ) : (
              <a
                href="/api/auth/google"
                className="btn-primary text-xs py-2 px-3.5 inline-flex items-center gap-1.5"
              >
                <Calendar size={13} />
                Connect Google Account
              </a>
            )}
          </div>
        </div>

        {/* 4 Tool functions */}
        <div className="pt-3 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
            <p className="font-medium text-white text-[11px]">1. Check Slot</p>
            <p className="font-mono text-[10px] text-zinc-500 truncate">check_calendar_availability</p>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
            <p className="font-medium text-white text-[11px]">2. Book Event</p>
            <p className="font-mono text-[10px] text-zinc-500 truncate">create_calendar_event</p>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
            <p className="font-medium text-white text-[11px]">3. Reschedule</p>
            <p className="font-mono text-[10px] text-zinc-500 truncate">update_calendar_event</p>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
            <p className="font-medium text-white text-[11px]">4. Cancel</p>
            <p className="font-mono text-[10px] text-zinc-500 truncate">delete_calendar_event</p>
          </div>
        </div>
      </div>

      {/* Bonus REST API Tool Card */}
      <div className="glass-card p-6 space-y-3">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shrink-0">
            <Smartphone size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-white">Bonus Agent Tool: Delivery & Order Status API</h3>
              <span className="badge badge-completed text-[10px]">Active Agent Tool</span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Autonomous REST API tool calling. Callers can state an Order or Tracking ID (e.g. <code className="text-emerald-400 bg-zinc-900 px-1 py-0.5 rounded">ORD-101</code>, <code className="text-emerald-400 bg-zinc-900 px-1 py-0.5 rounded">TRK-902</code>) and the assistant queries live dispatch status dynamically.
            </p>
          </div>
        </div>
      </div>

      {/* Voice Webhook URL */}
      <div className="glass-card p-6 space-y-3">
        <div className="flex items-start gap-3.5">
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

        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            readOnly
            value={webhookUrl}
            className="input-field text-xs font-mono bg-black"
          />
          <button
            type="button"
            onClick={() => copyToClipboard(webhookUrl)}
            className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3 shrink-0"
          >
            {copiedWebhook ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
            {copiedWebhook ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Environment & Fallback Status */}
      <div className="glass-card p-6 space-y-3">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white">Environment & Offline Demo Mode</h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              The application operates seamlessly in production with live OpenAI GPT-4o keys, and includes an autonomous simulation engine that executes realistic tool calling and conversations even without external API credentials.
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
      <div className="p-12 text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-zinc-400">Loading settings...</p>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}
