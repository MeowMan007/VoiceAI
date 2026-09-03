'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  Calendar, CheckCircle2, Smartphone,
  Power, Volume2, Bell, Clock, Save, ArrowRight
} from 'lucide-react'

interface BusinessSettings {
  assistantName: string
  voicePersona: string
  speakingPace: string
  operatingHours: string
  autoHandleAfterHours: boolean
  urgentSmsAlerts: boolean
  dailyEmailDigest: boolean
}

const DEFAULT_SETTINGS: BusinessSettings = {
  assistantName: 'Alex',
  voicePersona: 'professional_warm',
  speakingPace: 'natural',
  operatingHours: '09:00 - 20:00',
  autoHandleAfterHours: true,
  urgentSmsAlerts: true,
  dailyEmailDigest: true,
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('voiceai_business_settings')
      if (saved) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) })
    } catch {
      // ignore malformed local settings
    }
  }, [])

  const handleSave = () => {
    // These are cosmetic assistant-persona preferences only. Security-sensitive integrations
    // (Google Calendar) are connected per-business and stored encrypted server-side, not here.
    localStorage.setItem('voiceai_business_settings', JSON.stringify(settings))
    toast.success('Assistant preferences saved')
  }

  return (
    <div className="page-container" style={{ maxWidth: 840 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Assistant & Business Settings</h1>
          <p className="page-subtitle">
            Configure your Voice AI assistant’s personality, business hours, and notification preferences.
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
          {/* Calendar — connected per business, not here */}
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
                  Connected per business — tokens are encrypted server-side. Open a business profile to
                  connect or disconnect its calendar.
                </p>
              </div>
            </div>
            <Link href="/businesses" className="btn-secondary text-xs py-1.5 px-3 shrink-0 inline-flex items-center gap-1.5">
              Manage per business <ArrowRight size={13} />
            </Link>
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
                <p className="text-[13px] font-medium text-white">Order & Delivery Status Lookup</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  The assistant can look up order status by ID. Currently backed by a simulated courier
                  dataset — swap in a real courier API in <code>src/server/tools/order-lookup.ts</code>.
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <span className="badge badge-new">Simulated</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 5: System Status ────────────────────────── */}
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
              <CheckCircle2 size={14} style={{ color: 'var(--green)' }} />
              <span className="text-[12px] font-medium" style={{ color: 'var(--green)' }}>Operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
