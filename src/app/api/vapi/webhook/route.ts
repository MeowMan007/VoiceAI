import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkCalendarAvailability, createCalendarEvent } from '@/lib/google-calendar'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message } = body

    // 1. Handle Vapi Tool/Function Calling
    if (message?.type === 'tool-calls' || message?.type === 'function-call') {
      const toolCall = message.toolCalls?.[0] || message.functionCall
      const name = toolCall?.function?.name || toolCall?.name
      const args = typeof toolCall?.function?.arguments === 'string'
        ? JSON.parse(toolCall.function.arguments)
        : toolCall?.function?.arguments || toolCall?.parameters || {}

      let result: Record<string, unknown> = {}

      if (name === 'check_calendar_availability') {
        result = await checkCalendarAvailability('mock', args.date, args.time, args.duration_minutes)
      } else if (name === 'create_calendar_event') {
        result = await createCalendarEvent('mock', {
          title: args.title,
          date: args.date,
          time: args.time,
          durationMinutes: args.duration_minutes,
          description: args.description,
          attendeeName: args.attendee_name
        })
      } else if (name === 'lookup_delivery_status') {
        const orderId = (args.order_id || '').toUpperCase().trim()
        result = {
          order_id: orderId,
          status: 'Out for Delivery',
          eta: 'Today by 4:30 PM',
          location: 'Local Delivery Facility',
          message: `Order ${orderId} is out for delivery and scheduled to arrive today.`
        }
      }

      return NextResponse.json({
        results: [
          {
            toolCallId: toolCall.id,
            result: JSON.stringify(result)
          }
        ]
      })
    }

    // 2. Handle End-of-Call Webhook (save call record to DB)
    if (message?.type === 'end-of-call-report') {
      const supabase = createAdminClient()
      const {
        call,
        transcript,
        summary,
        analysis,
        customer
      } = message

      const callerPhone = customer?.number || call?.customer?.number || 'Unknown'
      const callerName = analysis?.structuredData?.caller_name || analysis?.structuredData?.name || 'Customer'
      const urgency = analysis?.structuredData?.urgency === 'urgent' ? 'urgent' : 'normal'

      await supabase.from('calls').insert({
        caller_name: callerName,
        caller_phone: callerPhone,
        status: 'new',
        intent: analysis?.structuredData?.intent || 'Missed Call Follow-up',
        summary: summary || 'Automated voice assistant handled missed call.',
        urgency,
        follow_up_status: 'pending',
        transcript: transcript || [],
        collected_data: analysis?.structuredData || {},
        language_used: 'en',
        duration_seconds: call?.duration || 0,
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Vapi webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
