import type OpenAI from 'openai'
import type { Workflow, WorkflowField } from '@/types'
import { completeChat, type ChatMessage, type GenerateOptions, hasLlmProvider } from '@/server/ai/llm'
import { generateSystemPrompt, detectSpokenLanguage } from '@/server/ai/prompts'
import { buildAgentTools } from '@/server/ai/tools'
import {
  checkCalendarAvailability,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@/lib/google-calendar'
import { lookupDeliveryStatus } from '@/server/tools/order-lookup'
import { generateSimulatedResponse } from '@/server/ai/fallback'

const MAX_TOOL_ITERATIONS = 4

export type ToolLog = {
  name: string
  arguments: Record<string, unknown>
  result: Record<string, unknown>
}

export type OrchestratorResult = {
  message: string
  toolsUsed: string[]
  toolLogs: ToolLog[]
  collectedData: Record<string, unknown>
  calendarEventId?: string
  calendarEventUrl?: string
  usedFallback: boolean
  languageUsed: 'en' | 'hi'
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  businessId: string
): Promise<Record<string, unknown>> {
  if (name === 'check_calendar_availability') {
    return checkCalendarAvailability(
      businessId,
      String(args.date || ''),
      String(args.time || ''),
      Number(args.duration_minutes) || 60
    )
  }
  if (name === 'create_calendar_event') {
    return createCalendarEvent(businessId, {
      title: String(args.title || 'Callback'),
      date: String(args.date || ''),
      time: String(args.time || ''),
      durationMinutes: Number(args.duration_minutes) || 30,
      description: args.description ? String(args.description) : undefined,
      attendeeName: args.attendee_name ? String(args.attendee_name) : undefined,
    })
  }
  if (name === 'update_calendar_event') {
    return updateCalendarEvent(businessId, String(args.event_id || ''), {
      newDate: args.new_date ? String(args.new_date) : undefined,
      newTime: args.new_time ? String(args.new_time) : undefined,
      newTitle: args.new_title ? String(args.new_title) : undefined,
    })
  }
  if (name === 'delete_calendar_event') {
    return deleteCalendarEvent(businessId, String(args.event_id || ''))
  }
  if (name === 'lookup_delivery_status') {
    return lookupDeliveryStatus(String(args.order_id || ''))
  }
  if (name === 'save_customer_data') {
    return { saved: true, ...args }
  }
  return { error: `Unknown tool: ${name}` }
}

export async function runConversationTurn(params: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  workflow: Workflow & { business?: { name?: string; type?: string } }
  aiConfig?: GenerateOptions
}): Promise<OrchestratorResult> {
  const { workflow, aiConfig } = params
  const lastUser = [...params.messages].reverse().find(m => m.role === 'user')?.content || ''
  const detected = detectSpokenLanguage(lastUser)
  const languageUsed = detected || workflow.language || 'en'

  const systemPrompt = generateSystemPrompt({
    ...workflow,
    languageOverride: languageUsed,
  })

  const tools = buildAgentTools((workflow.fields || []) as WorkflowField[], !!workflow.calendar_enabled)
  const conversation: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...params.messages.map(m => ({ role: m.role, content: m.content }) as ChatMessage),
  ]

  const collectedData: Record<string, unknown> = {}
  const toolLogs: ToolLog[] = []
  const toolsUsed: string[] = []
  let calendarEventId: string | undefined
  let calendarEventUrl: string | undefined
  let usedFallback = !hasLlmProvider(aiConfig)

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const choice = usedFallback
      ? generateSimulatedResponse(conversation, tools)
      : await completeChat(conversation, tools, aiConfig)

    if (choice.finish_reason !== 'tool_calls' || !choice.message.tool_calls?.length) {
      return {
        message: choice.message.content || '',
        toolsUsed,
        toolLogs,
        collectedData,
        calendarEventId,
        calendarEventUrl,
        usedFallback,
        languageUsed,
      }
    }

    conversation.push({
      role: 'assistant',
      content: choice.message.content,
      tool_calls: choice.message.tool_calls,
    })

    for (const toolCall of choice.message.tool_calls) {
      const name = toolCall.function.name
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(toolCall.function.arguments || '{}')
      } catch {
        args = {}
      }

      const result = await executeTool(name, args, workflow.business_id)
      if (name === 'save_customer_data') {
        Object.assign(collectedData, args)
      }
      if (name === 'create_calendar_event') {
        if (typeof result.eventId === 'string') calendarEventId = result.eventId
        if (typeof result.htmlLink === 'string') calendarEventUrl = result.htmlLink
      }

      toolsUsed.push(name)
      toolLogs.push({ name, arguments: args, result })
      conversation.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      })
    }
  }

  const last = await completeChat(conversation, undefined, aiConfig)
  return {
    message: last.message.content || 'I have recorded that for you.',
    toolsUsed,
    toolLogs,
    collectedData,
    calendarEventId,
    calendarEventUrl,
    usedFallback,
    languageUsed,
  }
}

export type { OpenAI }
