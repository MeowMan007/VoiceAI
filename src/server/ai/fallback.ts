import type OpenAI from 'openai'
import type { ChatMessage } from '@/server/ai/llm'

/** Last-resort path only when no LLM provider key is configured. */
export function generateSimulatedResponse(
  messages: ChatMessage[],
  tools?: OpenAI.Chat.ChatCompletionTool[]
): OpenAI.Chat.ChatCompletion.Choice {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || ''
  const lower = lastUserMsg.toLowerCase()
  const hasTool = (name: string) => tools?.some(t => t.type === 'function' && t.function.name === name)

  const isScheduleRequest =
    lower.includes('schedule') ||
    lower.includes('appointment') ||
    lower.includes('callback') ||
    lower.includes('book') ||
    lower.includes('tomorrow') ||
    lower.includes('slot')

  if (isScheduleRequest && hasTool('create_calendar_event')) {
    const toolCallId = `call_${Date.now()}`
    return {
      index: 0,
      finish_reason: 'tool_calls',
      logprobs: null,
      message: {
        role: 'assistant',
        content: null,
        refusal: null,
        tool_calls: [
          {
            id: toolCallId,
            type: 'function',
            function: {
              name: 'check_calendar_availability',
              arguments: JSON.stringify({
                date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                time: '16:00',
                duration_minutes: 30,
              }),
            },
          },
        ],
      },
    }
  }

  const isTrackingRequest =
    lower.includes('track') ||
    lower.includes('ord-') ||
    lower.includes('trk-') ||
    lower.includes('delivery status') ||
    lower.includes('order status')

  if (isTrackingRequest && hasTool('lookup_delivery_status')) {
    const orderMatch = lastUserMsg.match(/(ORD-\d+|TRK-\d+)/i)
    const orderId = orderMatch ? orderMatch[1].toUpperCase() : 'ORD-101'
    return {
      index: 0,
      finish_reason: 'tool_calls',
      logprobs: null,
      message: {
        role: 'assistant',
        content: null,
        refusal: null,
        tool_calls: [
          {
            id: `call_${Date.now()}`,
            type: 'function',
            function: {
              name: 'lookup_delivery_status',
              arguments: JSON.stringify({ order_id: orderId }),
            },
          },
        ],
      },
    }
  }

  if (hasTool('save_customer_data') && (lower.includes('cake') || lower.includes('chocolate') || lower.includes('kg'))) {
    return {
      index: 0,
      finish_reason: 'tool_calls',
      logprobs: null,
      message: {
        role: 'assistant',
        content: null,
        refusal: null,
        tool_calls: [
          {
            id: `call_${Date.now()}`,
            type: 'function',
            function: {
              name: 'save_customer_data',
              arguments: JSON.stringify({
                flavour: lower.includes('chocolate') ? 'chocolate' : undefined,
                weight: lastUserMsg.match(/(\d+(?:\.\d+)?)\s*kg/i)?.[1],
                required_date: lower.includes('tomorrow')
                  ? new Date(Date.now() + 86400000).toISOString().split('T')[0]
                  : undefined,
              }),
            },
          },
        ],
      },
    }
  }

  let reply = "I've noted that down for you. Could you also share the preferred date or delivery address?"
  if (lower.includes('नमस्ते') || lower.includes('धन्यवाद') || lower.includes('हाँ') || lower.includes('ऑर्डर')) {
    reply = 'जी बिल्कुल, मैंने आपकी जानकारी नोट कर ली है। क्या आप डिलीवरी का पता और संपर्क नंबर बता सकते हैं?'
  } else if (lower.includes('thank') || lower.includes('bye') || lower.includes('ok')) {
    reply = "Thank you for reaching out! We've captured all your details and our team will get back to you shortly. Have a wonderful day!"
  }

  return {
    index: 0,
    finish_reason: 'stop',
    logprobs: null,
    message: {
      role: 'assistant',
      content: reply,
      refusal: null,
    },
  }
}
