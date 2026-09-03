'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Calendar, Webhook, CheckCircle2, Copy, Smartphone,
  Power, Volume2, Bell, Clock, Building2, Save
} from 'lucide-react'

interface BusinessSettings {
  assistantName: string
  voicePersona: string
  speakingPace: string
  operatingHours: string
  autoHandleAfterHours: boolean
  urgentSmsAlerts: boolean
  dailyEmailDigest: boolean
  calendarSync: boolean
  deliveryApiSync: boolean
}

const DEFAULT_SETTINGS: BusinessSettings = {
  assistantName: 'Alex',
  voicePersona: 'professional_warm',
  speakingPace: 'natural',
  operatingHours: '09:00 - 20:00',
  autoHandleAfterHours: true,
  urgentSmsAlerts: true,
  dailyEmailDigest: true,
  calendarSync: true,
  deliveryApiSync: true,
}

function SettingsContent() {
  const searchParams = useSearchParams()
  const [googleConnected, setGoogleConnected] = useState(false)
  const [copied, setCopied] = useState(false)
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS)
  const [webhookUrl, setWebhookUrl] = useState('http://localhost:3000/api/vapi/webhook')

  useEffect(() => {
    setWebhookUrl(`${window.location.origin}/api/vapi/webhook`)
    try {
      const saved = localStorage.getItem('voiceai_business_settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        setSettings({ ...DEFAULT_SETTINGS, ...parsed })
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (searchParams.get('google_connected') === 'true') {
      setGoogleConnected(true)
      toast.success('Google Calendar connected')
    }
  }, [searchParams])

  const handleSave = () => {
    localStorage.setItem('voiceai_business_settings', JSON.stringify(settings))
    toast.success('Business settings updated successfully')
  }



  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="page-container" style={{ maxWidth: 840 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Assistant & Business Settings</h1>
          <p className="page-subtitle">
            Configure your Voice AI assistant’s personality, business hours, notification preferences, and integrations.
          </p>
        </div>
        <button onClick={handleSave} className="btn-primary">
          <Save size={14} /> Save Changes
        </button>
      </div>

      {/* ── Section 1: Voice AI Persona & Speech ─────────────── */}
      <div className="settings-group">
        <h2 className="settings-group-title">Voice Assistant Persona & Speech</h2>
        <div className="settings-section">
          {/* Assistant Name */}
          <div className="settings-row">
            <div className="flex items-start gap-3.5 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}
              >
                <Volume2 size={15} style={{ color: 'var(--green)' }} />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-white">Assistant Name</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Name used when greeting customers on missed calls
                </p>
              </div>
            </div>
            <div className="w-48">
              <input
                type="text"
                className="input-field text-xs py-1.5"
                value={settings.assistantName}
                onChange={e => setSettings({ ...settings, assistantName: e.target.value })}
              />
            </div>
          </div>

          {/* Voice Personality */}
          <div className="settings-row">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-8 h-8 shrink-0" />
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-white">Speaking Style & Persona</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Tone adapted to your industry (bakeries, clinics, logistics, real estate)
                </p>
              </div>
            </div>
            <div className="w-56">
              <select
                className="input-field text-xs py-1.5"
                value={settings.voicePersona}
                onChange={e => setSettings({ ...settings, voicePersona: e.target.value })}
              >
                <option value="professional_warm">Professional & Warm (Recommended)</option>
                <option value="friendly_energetic">Friendly & Energetic (Bakeries / Retail)</option>
                <option value="calm_empathetic">Calm & Empathetic (Clinics / Healthcare)</option>
                <option value="direct_efficient">Direct & Efficient (Logistics / Services)</option>
              </select>
            </div>
          </div>

          {/* Speaking Pace */}
          <div className="settings-row">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-8 h-8 shrink-0" />
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-white">Speaking Pace</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Pacing for clear phone audio comprehension
                </p>
              </div>
            </div>
            <div className="w-48">
              <select
                className="input-field text-xs py-1.5"
                value={settings.speakingPace}
                onChange={e => setSettings({ ...settings, speakingPace: e.target.value })}
              >
                <option value="natural">Natural (Normal)</option>
                <option value="deliberate">Deliberate & Clear (Slow)</option>
                <option value="brisk">Brisk (Fast)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: Business Hours & Call Coverage ──────────── */}
      <div className="settings-group">
        <h2 className="settings-group-title">Business Hours & Missed-Call Coverage</h2>
        <div className="settings-section">
          {/* Business Hours */}
          <div className="settings-row">
            <div className="flex items-start gap-3.5 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}
              >
                <Clock size={15} style={{ color: 'var(--text-secondary)' }} />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-white">Standard Business Hours</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  During which team is available before assistant takes over missed calls
                </p>
              </div>
            </div>
            <div className="w-48">
              <input
                type="text"
                className="input-field text-xs py-1.5 font-mono"
                value={settings.operatingHours}
                onChange={e => setSettings({ ...settings, operatingHours: e.target.value })}
              />
            </div>
          </div>

          {/* After Hours Coverage */}
          <div className="settings-row">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-8 h-8 shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-white">24/7 After-Hours Missed-Call Handling</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Automatically answer customer calls when closed or staff lines are busy
                </p>
              </div>
            </div>
            <label className="toggle shrink-0">
              <input
                type="checkbox"
                checked={settings.autoHandleAfterHours}
                onChange={e => setSettings({ ...settings, autoHandleAfterHours: e.target.checked })}
              />
              <div className="toggle-track">
                <div className="toggle-thumb" />
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* ── Section 3: Automated Follow-Up & Notifications ───── */}
      <div className="settings-group">
        <h2 className="settings-group-title">Automated Follow-ups & Owner Alerts</h2>
        <div className="settings-section">
          {/* Urgent SMS Alerts */}
          <div className="settings-row">
            <div className="flex items-start gap-3.5 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}
              >
                <Bell size={15} style={{ color: 'var(--text-secondary)' }} />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-white">Urgent Call SMS Alerts</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Send immediate SMS to business owner when a high-urgency call is classified
                </p>
              </div>
            </div>
            <label className="toggle shrink-0">
              <input
                type="checkbox"
                checked={settings.urgentSmsAlerts}
                onChange={e => setSettings({ ...settings, urgentSmsAlerts: e.target.checked })}
              />
              <div className="toggle-track">
                <div className="toggle-thumb" />
              </div>
            </label>
          </div>

          {/* Daily Email Digest */}
          <div className="settings-row">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-8 h-8 shrink-0" />
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-white">Daily Missed-Call Digest</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Receive a daily summary of captured leads, appointments, and pending callbacks
                </p>
              </div>
            </div>
            <label className="toggle shrink-0">
              <input
                type="checkbox"
                checked={settings.dailyEmailDigest}
                onChange={e => setSettings({ ...settings, dailyEmailDigest: e.target.checked })}
              />
              <div className="toggle-track">
                <div className="toggle-thumb" />
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* ── Section 4: Connected Business Tools ──────────────── */}
      <div className="settings-group">
        <h2 className="settings-group-title">Connected Business Integrations</h2>
        <div className="settings-section">
          {/* Calendar */}
          <div className="settings-row">
            <div className="flex items-start gap-3.5 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}
              >
                <Calendar size={15} style={{ color: 'var(--text-secondary)' }} />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-white">Google Calendar Appointment Booking</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Enables assistant to check slot availability and schedule appointments in real time
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {googleConnected ? (
                <>
                  <span className="badge badge-completed">Connected</span>
                  <button
                    onClick={() => { setGoogleConnected(false); toast.success('Disconnected') }}
                    className="btn-secondary text-xs py-1.5 px-3"
                    style={{ color: '#f87171' }}
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <>
                  <span className="badge badge-closed">Not Connected</span>
                  <a href="/api/auth/google" className="btn-secondary text-xs py-1.5 px-3">
                    Connect
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Delivery API */}
          <div className="settings-row">
            <div className="flex items-start gap-3.5 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}
              >
                <Smartphone size={15} style={{ color: 'var(--text-secondary)' }} />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-white">Live Courier & Order Tracking API</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Enables assistant to query live package delivery statuses by order ID
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <span className="badge badge-completed">Active</span>
            </div>
          </div>
        </div>
      </div>



      {/* ── Section 5: Telephony Forwarding & Webhook ────────── */}
      <div className="settings-group">
        <h2 className="settings-group-title">Phone Line & Webhook Integration</h2>
        <div className="settings-section">
          <div className="settings-row flex-col items-start gap-3.5">
            <div className="flex items-start gap-3.5 w-full">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}
              >
                <Webhook size={15} style={{ color: 'var(--text-secondary)' }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-white">Incoming Call Webhook URL</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Forward your business missed calls to this endpoint to trigger your Voice AI assistant.
                </p>
              </div>
            </div>
            <div className="w-full flex items-center gap-2 pl-[44px]">
              <code
                className="flex-1 text-xs font-mono px-3 py-2 rounded-lg truncate text-white"
                style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}
              >
                {webhookUrl}
              </code>
              <button onClick={copyWebhook} className="btn-secondary text-xs py-2 px-3 shrink-0">
                {copied ? <CheckCircle2 size={13} style={{ color: 'var(--green)' }} /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 6: System Status ────────────────────────── */}
      <div className="settings-group">
        <h2 className="settings-group-title">Platform Status</h2>
        <div className="settings-section">
          <div className="settings-row">
            <div className="flex items-start gap-3.5 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}
              >
                <Power size={15} style={{ color: 'var(--text-secondary)' }} />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-white">Voice Engine Status</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Autonomous speech processing and tool execution active
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="status-dot status-dot-green" />
              <span className="text-[12px] font-medium" style={{ color: 'var(--green)' }}>All Systems Operational</span>
            </div>
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
        <div
          className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3"
          style={{ borderColor: 'var(--green)' }}
        />
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading settings...</p>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}
