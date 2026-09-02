import OpenAI from 'openai'

const apiKey = process.env.OPENAI_API_KEY || 'dummy_key_for_build'

const openai = new OpenAI({
  apiKey,
})

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function generateChatResponse(
  messages: ChatMessage[],
  tools?: OpenAI.Chat.ChatCompletionTool[]
) {
  // If no valid OpenAI key is set, use intelligent simulation engine
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your_') || process.env.OPENAI_API_KEY === 'dummy_key_for_build') {
    return generateSimulatedResponse(messages, tools)
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools: tools?.length ? tools : undefined,
      tool_choice: tools?.length ? 'auto' : undefined,
      temperature: 0.7,
      max_tokens: 500,
    })

    return response.choices[0]
  } catch (error) {
    console.warn('OpenAI API call failed, falling back to simulated response:', error)
    return generateSimulatedResponse(messages, tools)
  }
}

function generateSimulatedResponse(
  messages: ChatMessage[],
  tools?: OpenAI.Chat.ChatCompletionTool[]
): OpenAI.Chat.ChatCompletion.Choice {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || ''
  const lower = lastUserMsg.toLowerCase()

  // 1. Check if user wants to schedule an appointment or callback (Calendar Tool Call)
  const isScheduleRequest = lower.includes('schedule') || lower.includes('appointment') || lower.includes('callback') || lower.includes('book') || lower.includes('tomorrow') || lower.includes('slot')
  if (isScheduleRequest && tools?.some(t => t.function.name === 'create_calendar_event')) {
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
              name: 'create_calendar_event',
              arguments: JSON.stringify({
                title: 'Customer Callback / Appointment',
                date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                time: '16:00',
                duration_minutes: 30,
                attendee_name: 'Caller',
                description: `Customer requested follow-up: "${lastUserMsg}"`
              })
            }
          }
        ]
      }
    }
  }

  // 2. Check if user is asking about order or delivery tracking (External API Tool Call)
  const isTrackingRequest = lower.includes('track') || lower.includes('ord-') || lower.includes('trk-') || lower.includes('delivery status') || lower.includes('order status')
  if (isTrackingRequest && tools?.some(t => t.function.name === 'lookup_delivery_status')) {
    const orderMatch = lastUserMsg.match(/(ORD-\d+|TRK-\d+)/i)
    const orderId = orderMatch ? orderMatch[1].toUpperCase() : 'ORD-101'
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
              name: 'lookup_delivery_status',
              arguments: JSON.stringify({
                order_id: orderId
              })
            }
          }
        ]
      }
    }
  }

  // 3. Contextual conversational replies
  let reply = "I've noted that down for you. Could you also share the preferred date or delivery address?"

  if (lower.includes('cake') || lower.includes('chocolate') || lower.includes('flavour') || lower.includes('order')) {
    reply = "Wonderful! I have recorded your cake preferences. What date and delivery address would you like this scheduled for?"
  } else if (lower.includes('emergency') || lower.includes('urgent') || lower.includes('leak') || lower.includes('repair')) {
    reply = "I understand this is urgent! I have flagged your request with High Priority. Our on-call technician will reach out immediately. What is the service address?"
  } else if (lower.includes('नमस्ते') || lower.includes('धन्यवाद') || lower.includes('हाँ') || lower.includes('ऑर्डर')) {
    reply = "जी बिल्कुल, मैंने आपकी जानकारी नोट कर ली है। क्या आप डिलीवरी का पता और संपर्क नंबर बता सकते हैं?"
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
      refusal: null
    }
  }
}

export async function generateSummary(
  transcript: Array<{ role: string; content: string }>,
  collectedData: Record<string, unknown>,
  businessType: string
): Promise<string> {
  const transcriptText = transcript
    .map(m => `${m.role === 'assistant' ? 'Assistant' : 'Customer'}: ${m.content}`)
    .join('\n')

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your_') || process.env.OPENAI_API_KEY === 'dummy_key_for_build') {
    const callerNeeds = Object.entries(collectedData)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
    return `Customer called regarding ${businessType.replace('_', ' ')}. Captured details: ${callerNeeds || 'enquiry logged'}. Follow-up scheduled.`
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a business assistant. Summarize this customer conversation for a ${businessType} business owner in 2-3 sentences. Focus on what the customer needs and any important details.`
        },
        {
          role: 'user',
          content: `Conversation:\n${transcriptText}\n\nCollected Data:\n${JSON.stringify(collectedData, null, 2)}`
        }
      ],
      temperature: 0.5,
      max_tokens: 200,
    })

    return response.choices[0].message.content || 'Customer called and left details.'
  } catch {
    return `Customer called regarding ${businessType.replace('_', ' ')}. Conversation logged and scheduled for follow-up.`
  }
}

export const CALENDAR_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'check_calendar_availability',
      description: 'Check if a specific date and time slot is available in the calendar',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
          time: { type: 'string', description: 'Time in HH:MM format (24hr)' },
          duration_minutes: { type: 'number', description: 'Duration of the event in minutes' }
        },
        required: ['date', 'time']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_calendar_event',
      description: 'Create a new calendar event for an appointment or callback',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Event title' },
          date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
          time: { type: 'string', description: 'Start time in HH:MM format (24hr)' },
          duration_minutes: { type: 'number', description: 'Duration in minutes' },
          description: { type: 'string', description: 'Event description or notes' },
          attendee_name: { type: 'string', description: 'Name of the customer/attendee' }
        },
        required: ['title', 'date', 'time']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_calendar_event',
      description: 'Update an existing calendar event',
      parameters: {
        type: 'object',
        properties: {
          event_id: { type: 'string', description: 'The calendar event ID to update' },
          new_date: { type: 'string', description: 'New date in YYYY-MM-DD format' },
          new_time: { type: 'string', description: 'New time in HH:MM format' },
          new_title: { type: 'string', description: 'New title if changing' }
        },
        required: ['event_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_calendar_event',
      description: 'Cancel and delete a calendar event',
      parameters: {
        type: 'object',
        properties: {
          event_id: { type: 'string', description: 'The calendar event ID to delete' },
          reason: { type: 'string', description: 'Reason for cancellation' }
        },
        required: ['event_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'lookup_delivery_status',
      description: 'Query external delivery tracking or order status API using an order ID or tracking number (e.g. ORD-101, TRK-902)',
      parameters: {
        type: 'object',
        properties: {
          order_id: { type: 'string', description: 'Order ID or tracking number' }
        },
        required: ['order_id']
      }
    }
  }
]

export const AGENT_TOOLS = CALENDAR_TOOLS

export { openai }
