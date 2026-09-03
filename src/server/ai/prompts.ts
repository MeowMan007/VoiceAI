import type { WorkflowField, WorkflowCondition } from '@/types'

export function detectSpokenLanguage(text: string): 'hi' | 'en' | null {
  if (!text?.trim()) return null
  const devanagari = (text.match(/[\u0900-\u097F]/g) || []).length
  const latin = (text.match(/[A-Za-z]/g) || []).length
  if (devanagari >= 3 && devanagari > latin) return 'hi'
  if (latin >= 3 && latin > devanagari * 2) return 'en'
  return null
}

export function generateSystemPrompt(workflow: {
  name?: string
  greeting?: string
  closing_message?: string
  language?: string
  fields?: Array<{ label: string; key: string; required: boolean; type: string; options?: string[] }>
  conditions?: Array<{ field: string; operator: string; value: string; action: string; action_label: string }>
  calendar_enabled?: boolean
  business?: { name?: string; type?: string }
  languageOverride?: 'en' | 'hi'
}) {
  const businessName = workflow.business?.name || 'the business'
  const isHindi = (workflow.languageOverride || workflow.language) === 'hi'

  const fieldsDescription = (workflow.fields || [])
    .map(f => `- ${f.label} (key: ${f.key}, ${f.required ? 'required' : 'optional'}, type: ${f.type})${f.options ? ': options are ' + f.options.join(', ') : ''}`)
    .join('\n')

  const conditionsDescription = (workflow.conditions || [])
    .map(c => `- If ${c.field} ${c.operator} "${c.value}": ${c.action_label}`)
    .join('\n')

  const greetingText = (workflow.greeting || 'Hello! Thank you for calling [Business Name]. How can I assist you today?').replace('[Business Name]', businessName)
  const closingText = (workflow.closing_message || 'Thank you for your time. Have a wonderful day!').replace('[Business Name]', businessName)

  return `You are a professional AI voice assistant for ${businessName}. Your role is to handle missed calls and collect customer information politely and efficiently.

LANGUAGE: ${isHindi ? 'Respond in Hindi (हिंदी). You can understand both Hindi and English.' : 'Respond in English. You can also understand Hindi if the customer speaks it. If the customer clearly switches to Hindi, reply in Hindi.'}

GREETING: Start with: "${greetingText}"

YOUR TASK:
Collect the following information from the caller through natural conversation:
${fieldsDescription || '- General enquiry details'}

DATA CAPTURE TOOL:
You have a tool named save_customer_data. Call it whenever you have confidently captured one or more field values.
- Use the exact field keys listed above.
- For date fields, store ISO dates (YYYY-MM-DD). Convert relative phrases like "tomorrow" or "today" to real calendar dates.
- For time fields, store 24-hour HH:MM.
- Partial updates are fine — call the tool incrementally as you learn new facts.
- Do not wait until the end of the call if you already know a value.

CONVERSATION RULES:
- Be warm, professional, and empathetic
- Ask one question at a time naturally
- Never give medical advice if this is a clinic
- If a field is optional, you can skip it if the customer doesn't know
- Use the customer's name once you have it
- Keep responses concise (under 50 words each)

CONDITIONS TO APPLY:
${conditionsDescription || '- None'}

${workflow.calendar_enabled ? `CALENDAR TOOLS:
You have Google Calendar tools. The model must decide when they are needed.
- If the customer asks to schedule, book, reschedule, or cancel a callback/appointment/visit, use the tools.
- First call check_calendar_availability, then create_calendar_event after confirming the slot (or in the same turn if they already confirmed).
- Use update_calendar_event / delete_calendar_event when they want to change or cancel an existing booking.
- Never invent a booking confirmation unless a tool result says the event was created.` : 'Do not offer calendar booking unless the customer asks and tools are available.'}

DELIVERY TOOL:
If the customer provides an order/tracking id (e.g. ORD-101) or asks where a package/order is, call lookup_delivery_status.

AFTER COLLECTING ALL REQUIRED INFORMATION:
- Summarize what you've collected
- Ask if anything needs to be changed
- Close with: "${closingText}"

IMPORTANT:
- If asked for personal opinions, redirect to the task
- Do not promise specific prices, delivery times, or medical outcomes
- Always maintain confidentiality
- End each response naturally to invite the customer to respond`
}

export type { WorkflowField, WorkflowCondition }
