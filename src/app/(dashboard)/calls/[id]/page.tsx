'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Call, BUSINESS_TYPES, CallStatus } from '@/types'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Phone, Calendar, CheckCircle2, MessageSquare,
  ExternalLink, Sparkles, Check, X, Building2, User, Bot, FileText
} from 'lucide-react'
import { formatDate, formatRelativeTime, cn } from '@/lib/utils'

const SEED_CALLS: Record<string, Call> = {
  'call-seed-1': {
    id: 'call-seed-1',
    business_id: 'biz-1',
    workflow_id: 'wf-1',
    caller_name: 'Rahul Sharma',
    caller_phone: '+91 98765 43210',
    status: 'in_progress',
    intent: 'Order Custom Chocolate Truffle Cake',
    summary: 'Customer called to order a 1kg chocolate truffle cake for a birthday tomorrow afternoon. Delivery requested by 4:00 PM to Indiranagar, Bangalore.',
    urgency: 'urgent',
    follow_up_status: 'pending',
    transcript: [
      { role: 'assistant', content: "Hello, thanks for calling Sweet Delights Bakery. Sorry we missed your call. How can I assist you with your order today?", timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
      { role: 'user', content: "Hi, I need to order a 1kg chocolate truffle cake urgently for tomorrow afternoon.", timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString() },
      { role: 'assistant', content: "Wonderful, I have recorded your order for a 1kg Chocolate Truffle cake. What delivery address and preferred time would you like this scheduled for?", timestamp: new Date(Date.now() - 1000 * 60 * 13).toISOString() },
      { role: 'user', content: "Delivery to 12th Main Indiranagar, by 4 PM please. My name is Rahul Sharma.", timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString() },
      { role: 'assistant', content: "Thank you Rahul, your order has been flagged as High Priority since it is required within 24 hours. Our team will confirm dispatch shortly.", timestamp: new Date(Date.now() - 1000 * 60 * 11).toISOString() }
    ],
    collected_data: { flavour: 'Chocolate Truffle', weight: '1kg', required_date: 'Tomorrow', delivery_address: '12th Main Indiranagar', caller_name: 'Rahul Sharma' },
    language_used: 'en',
    created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    updated_at: new Date().toISOString(),
    business: {
      id: 'biz-1',
      owner_id: 'demo',
      name: 'Sweet Delights Bakery',
      type: 'cake_shop',
      language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  'call-seed-2': {
    id: 'call-seed-2',
    business_id: 'biz-2',
    workflow_id: 'wf-2',
    caller_name: 'Anita Verma',
    caller_phone: '+91 98111 22334',
    status: 'completed',
    intent: 'Doctor Appointment Consultation',
    summary: 'Patient requested appointment callback for tomorrow at 4:00 PM. Verified calendar slot and scheduled follow-up.',
    urgency: 'normal',
    follow_up_status: 'resolved',
    calendar_event_id: 'cal_event_98231',
    calendar_event_url: 'https://calendar.google.com',
    transcript: [
      { role: 'assistant', content: "Hello, you have reached Apex Family Clinic. Would you like to book an appointment or check timings?", timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
      { role: 'user', content: "I would like to schedule an appointment with Dr. Sharma tomorrow around 4 PM please.", timestamp: new Date(Date.now() - 1000 * 60 * 44).toISOString() },
      { role: 'assistant', content: "Let me check calendar availability for tomorrow at 4:00 PM. The slot is open. I have created the appointment for Anita Verma with Dr. Sharma. You will receive an SMS confirmation.", timestamp: new Date(Date.now() - 1000 * 60 * 43).toISOString() }
    ],
    collected_data: { patient_name: 'Anita Verma', doctor_preference: 'Dr. Sharma', preferred_time: '16:00', calendar_booking: 'Confirmed' },
    language_used: 'en',
    created_at: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    updated_at: new Date().toISOString(),
    business: {
      id: 'biz-2',
      owner_id: 'demo',
      name: 'Apex Family Clinic',
      type: 'clinic',
      language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }
}

import { localDB } from '@/lib/local-db'

export default function CallDetailPage() {
  const params = useParams()
  const callId = params?.id as string
  const [call, setCall] = useState<Call | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const fetchCall = () => {
    setLoading(true)
    const localCall = localDB.getCall(callId)
    if (localCall) {
      const biz = localDB.getBusiness(localCall.business_id)
      const wf = localDB.getWorkflow(localCall.workflow_id)
      setCall({ ...localCall, business: biz || undefined, workflow: wf || undefined } as Call)
    } else if (SEED_CALLS[callId]) {
      setCall(SEED_CALLS[callId])
    } else {
      const firstCall = localDB.getCalls()[0]
      if (firstCall) {
        const biz = localDB.getBusiness(firstCall.business_id)
        setCall({ ...firstCall, business: biz || undefined } as Call)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    if (callId) fetchCall()
  }, [callId])

  const handleStatusChange = (status: CallStatus, followUp: Call['follow_up_status']) => {
    setUpdating(true)
    localDB.updateCall(callId, { status, follow_up_status: followUp })
    toast.success(`Marked as ${followUp}`)
    setCall(prev => prev ? { ...prev, status, follow_up_status: followUp } : null)
    setUpdating(false)
  }

  if (loading) {
    return (
      <div className="p-16 text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-zinc-400">Loading call interaction...</p>
      </div>
    )
  }

  if (!call) return null

  const biz = call.business as { name: string; type: string; phone?: string } | null
  const typeInfo = biz?.type ? BUSINESS_TYPES[biz.type as keyof typeof BUSINESS_TYPES] : null

  return (
    <div className="p-8 lg:p-10 max-w-7xl w-full mx-auto space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <Link
            href="/calls"
            className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white font-display">
                {call.caller_name || 'Caller Record'}
              </h1>
              <span className={cn('badge', {
                'badge-urgent': call.urgency === 'urgent',
                'badge-new': call.urgency === 'normal',
                'badge-completed': call.urgency === 'low'
              })}>
                {call.urgency === 'urgent' ? 'Urgent' : call.urgency === 'normal' ? 'Normal' : 'Low'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Call ID: <span className="font-mono text-zinc-300">{call.id}</span> • {formatDate(call.created_at)}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleStatusChange('in_progress', 'contacted')}
            disabled={updating || call.follow_up_status === 'contacted'}
            className={cn(
              'btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5',
              call.follow_up_status === 'contacted' && 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
            )}
          >
            <Check size={13} /> Mark Contacted
          </button>
          <button
            onClick={() => handleStatusChange('completed', 'resolved')}
            disabled={updating || call.follow_up_status === 'resolved'}
            className={cn(
              'btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5',
              call.follow_up_status === 'resolved' && 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
            )}
          >
            <CheckCircle2 size={13} /> Mark Resolved
          </button>
          <button
            onClick={() => handleStatusChange('closed', 'closed')}
            disabled={updating || call.follow_up_status === 'closed'}
            className={cn(
              'btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5',
              call.follow_up_status === 'closed' && 'border-zinc-700 text-zinc-400'
            )}
          >
            <X size={13} /> Close
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Metadata & AI Summary */}
        <div className="space-y-6 lg:col-span-1">
          {/* Quick Info Card */}
          <div className="glass-card p-6 space-y-4 text-xs">
            <h3 className="font-semibold uppercase tracking-wider text-emerald-400 text-xs">
              Call Details
            </h3>

            <div>
              <p className="text-zinc-500 text-[10px] uppercase font-mono">Caller Phone</p>
              <p className="font-semibold text-white mt-1 text-sm">{call.caller_phone || 'Direct line'}</p>
            </div>

            <div>
              <p className="text-zinc-500 text-[10px] uppercase font-mono">Assigned Business</p>
              <div className="flex items-center gap-2 mt-1">
                <Building2 size={15} className="text-zinc-400" />
                <span className="font-semibold text-white text-sm">{biz?.name || 'General'}</span>
              </div>
            </div>

            <div>
              <p className="text-zinc-500 text-[10px] uppercase font-mono">Classified Intent</p>
              <p className="font-medium text-emerald-400 mt-1">{call.intent || 'General Enquiry'}</p>
            </div>

            <div>
              <p className="text-zinc-500 text-[10px] uppercase font-mono">Timestamp</p>
              <p className="font-medium text-white mt-1">{formatRelativeTime(call.created_at)}</p>
            </div>

            <div>
              <p className="text-zinc-500 text-[10px] uppercase font-mono">Language</p>
              <p className="font-medium text-white mt-1">English</p>
            </div>
          </div>

          {/* AI Executive Summary Card */}
          <div className="glass-card p-6 space-y-3 border-emerald-500/20 bg-zinc-950">
            <div className="flex items-center gap-2 text-emerald-400">
              <Sparkles size={16} />
              <h3 className="font-semibold text-xs tracking-wider uppercase">AI Generated Summary</h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed pt-1">
              {call.summary || 'Summary unavailable.'}
            </p>
          </div>

          {/* Calendar Tool Result */}
          {call.calendar_event_id && (
            <div className="glass-card p-6 space-y-3 border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-center gap-2 text-emerald-400">
                <Calendar size={16} />
                <h3 className="font-semibold text-xs uppercase tracking-wider">Google Calendar Event</h3>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Appointment created on connected calendar via autonomous agent tool.
              </p>
              <p className="font-mono text-[11px] text-zinc-400 truncate">ID: {call.calendar_event_id}</p>
              {call.calendar_event_url && (
                <a
                  href={call.calendar_event_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline pt-1 font-medium"
                >
                  View in Google Calendar <ExternalLink size={13} />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Captured Data & Transcript */}
        <div className="space-y-6 lg:col-span-2">
          {/* Structured Information Grid */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-semibold text-xs text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <FileText size={15} /> Captured Customer Information
            </h3>

            {Object.keys(call.collected_data || {}).length === 0 ? (
              <p className="text-xs text-zinc-500">No structured fields extracted.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(call.collected_data || {}).map(([key, val]) => (
                  <div key={key} className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800">
                    <p className="text-[10px] uppercase font-mono text-zinc-400">
                      {key.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs font-semibold text-white mt-1">
                      {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Full Conversation Transcript */}
          <div className="glass-card p-6 space-y-5">
            <h3 className="font-semibold text-xs text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare size={15} /> Conversational Transcript
            </h3>

            <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
              {(call.transcript || []).map((msg, i) => {
                const isUser = msg.role === 'user'
                return (
                  <div
                    key={i}
                    className={cn('flex gap-3', isUser ? 'flex-row-reverse' : '')}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 font-bold',
                        isUser ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-white'
                      )}
                    >
                      {isUser ? <User size={13} /> : <Bot size={13} />}
                    </div>

                    <div
                      className={cn(
                        'max-w-[85%] px-4 py-3 rounded-xl text-xs leading-relaxed',
                        isUser
                          ? 'bg-emerald-500 text-black font-medium'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-200'
                      )}
                    >
                      <p className={cn('text-[10px] font-mono uppercase tracking-wider mb-1', isUser ? 'text-black/70' : 'text-zinc-500')}>
                        {isUser ? 'Caller' : 'Voice Assistant'}
                      </p>
                      <p>{msg.content}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
