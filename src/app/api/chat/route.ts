import { NextRequest, NextResponse } from 'next/server'
import { generateChatResponse, generateSummary, AGENT_TOOLS } from '@/lib/openai'
import { generateSystemPrompt, extractDataFromConversation, detectUrgency } from '@/lib/utils'
import { checkCalendarAvailability, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, workflow, calendarAccessToken, aiConfig } = body

    if (!workflow || !messages) {
      return NextResponse.json({ error: 'Missing workflow or messages' }, { status: 400 })
    }

    const systemPrompt = generateSystemPrompt(workflow)
    const tools = AGENT_TOOLS

    const allMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages
    ]

    const choice = await generateChatResponse(allMessages, tools, aiConfig)

    if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
      const toolCall = choice.message.tool_calls[0]
      const toolName = toolCall.function.name
      const toolArgs = JSON.parse(toolCall.function.arguments)

      let toolResult: Record<string, unknown> = {}

      if (toolName === 'check_calendar_availability') {
        toolResult = await checkCalendarAvailability(
          calendarAccessToken || 'mock',
          toolArgs.date,
          toolArgs.time,
          toolArgs.duration_minutes
        )
      } else if (toolName === 'create_calendar_event') {
        toolResult = await createCalendarEvent(
          calendarAccessToken || 'mock',
          {
            title: toolArgs.title,
            date: toolArgs.date,
            time: toolArgs.time,
            durationMinutes: toolArgs.duration_minutes,
            description: toolArgs.description,
            attendeeName: toolArgs.attendee_name
          }
        )
      } else if (toolName === 'update_calendar_event') {
        toolResult = await updateCalendarEvent(
          calendarAccessToken || 'mock',
          toolArgs.event_id,
          { newDate: toolArgs.new_date, newTime: toolArgs.new_time, newTitle: toolArgs.new_title }
        )
      } else if (toolName === 'delete_calendar_event') {
        toolResult = await deleteCalendarEvent(calendarAccessToken || 'mock', toolArgs.event_id)
      } else if (toolName === 'lookup_delivery_status') {
        const orderId = (toolArgs.order_id || '').toUpperCase().trim()
        toolResult = {
          order_id: orderId,
          status: orderId === 'ORD-101' ? 'Out for Delivery' : orderId === 'ORD-102' ? 'In Kitchen / Baking' : 'In Transit with Courier',
          eta: orderId === 'ORD-101' ? 'Today by 4:30 PM' : 'Expected today within 2-3 hours',
          location: 'Local Delivery Facility / Transit Hub',
          message: `Order ${orderId} is currently verified and in transit. Estimated delivery: Today within 2-3 hours.`
        }
      }

      const followUpMessages = [
        ...allMessages,
        { role: 'assistant' as const, content: choice.message.content || '' },
        {
          role: 'tool' as const,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult)
        }
      ]

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const followUpChoice = await generateChatResponse(followUpMessages as any, tools)

      return NextResponse.json({
        message: followUpChoice.message.content,
        toolUsed: toolName,
        toolResult,
        calendarEventId: (toolResult as Record<string, unknown>).eventId
      })
    }

    return NextResponse.json({ message: choice.message.content })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate response', message: 'I apologize, I had trouble processing that. Could you please repeat?' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { transcript, workflow, calledData } = body

    const supabase = createAdminClient()

    const summary = await generateSummary(transcript, calledData, workflow?.business?.type || 'general')
    const urgency = detectUrgency(calledData, workflow?.conditions || [])
    const collectedData = extractDataFromConversation(transcript, workflow?.fields || [])

    const mergedData = { ...collectedData, ...calledData }

    const { data: call, error } = await supabase
      .from('calls')
      .insert({
        business_id: workflow?.business_id,
        workflow_id: workflow?.id,
        caller_name: mergedData.caller_name || mergedData.patient_name || mergedData.contact_name || null,
        caller_phone: mergedData.caller_phone || mergedData.contact_number || null,
        status: 'new',
        intent: mergedData.order_type || mergedData.request_type || mergedData.interest_type || mergedData.service_type || 'General Enquiry',
        summary,
        urgency,
        follow_up_status: 'pending',
        transcript,
        collected_data: mergedData,
        language_used: workflow?.language || 'en',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, call })
  } catch (error) {
    console.error('Save call error:', error)
    return NextResponse.json({ error: 'Failed to save call record' }, { status: 500 })
  }
}
