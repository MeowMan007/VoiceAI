import { NextRequest, NextResponse } from 'next/server'
import { generateSummary } from '@/lib/openai'
import { detectUrgency } from '@/server/ai/conditions'
import { runConversationTurn } from '@/server/ai/orchestrator'
import { requireUser, assertOwnsBusiness } from '@/lib/auth'
import type { Workflow, WorkflowField, WorkflowCondition } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser()
    if (auth.error) return auth.error

    const body = await request.json()
    const { messages, workflow, aiConfig } = body as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>
      workflow: Workflow & { business?: { name?: string; type?: string } }
      aiConfig?: { provider?: 'gemini' | 'openai' | 'simulator'; apiKey?: string; model?: string }
    }

    if (!workflow || !messages) {
      return NextResponse.json({ error: 'Missing workflow or messages' }, { status: 400 })
    }

    if (workflow.business_id) {
      const owns = await assertOwnsBusiness(auth.supabase, auth.user.id, workflow.business_id)
      if (!owns) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await runConversationTurn({ messages, workflow, aiConfig })

    return NextResponse.json({
      message: result.message,
      toolsUsed: result.toolsUsed,
      toolUsed: result.toolsUsed[result.toolsUsed.length - 1],
      toolLogs: result.toolLogs,
      collectedData: result.collectedData,
      calendarEventId: result.calendarEventId,
      calendarEventUrl: result.calendarEventUrl,
      usedFallback: result.usedFallback,
      languageUsed: result.languageUsed,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate response',
        message: 'I apologize, I had trouble processing that. Could you please repeat?',
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireUser()
    if (auth.error) return auth.error

    const body = await request.json()
    const { transcript, workflow, calledData, calendarEventId, calendarEventUrl } = body as {
      transcript: Array<{ role: string; content: string; timestamp?: string }>
      workflow: Workflow & { business?: { type?: string }; fields?: WorkflowField[]; conditions?: WorkflowCondition[] }
      calledData?: Record<string, unknown>
      calendarEventId?: string
      calendarEventUrl?: string
    }

    if (!workflow?.business_id) {
      return NextResponse.json({ error: 'workflow.business_id required' }, { status: 400 })
    }

    const owns = await assertOwnsBusiness(auth.supabase, auth.user.id, workflow.business_id)
    if (!owns) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const mergedData = { ...(calledData || {}) }
    const summary = await generateSummary(transcript || [], mergedData, workflow?.business?.type || 'general')
    const urgency = detectUrgency(mergedData, workflow?.conditions || [], workflow?.fields || [])

    const callPayload = {
      business_id: workflow.business_id,
      workflow_id: workflow.id,
      caller_name:
        String(mergedData.caller_name || mergedData.patient_name || mergedData.contact_name || 'Caller'),
      caller_phone: String(mergedData.caller_phone || mergedData.contact_number || '+91 98000 00000'),
      status: 'completed' as const,
      intent: String(
        mergedData.order_type ||
        mergedData.request_type ||
        mergedData.interest_type ||
        mergedData.service_type ||
        'Customer Inquiry'
      ),
      summary,
      urgency,
      follow_up_status: 'pending' as const,
      transcript,
      collected_data: mergedData,
      language_used: workflow.language || 'en',
      calendar_event_id: calendarEventId || null,
      calendar_event_url: calendarEventUrl || null,
    }

    try {
      const { data: call, error } = await auth.supabase
        .from('calls')
        .insert(callPayload)
        .select()
        .single()

      if (!error && call) {
        return NextResponse.json({ success: true, call })
      }
    } catch {
      // Supabase unavailable, fallback to localDB
    }

    const localCall = (await import('@/lib/local-db')).localDB.calls.create(callPayload as any)
    return NextResponse.json({ success: true, call: localCall })
  } catch (error) {
    console.error('Save call error:', error)
    return NextResponse.json({ error: 'Failed to save call record' }, { status: 500 })
  }
}

