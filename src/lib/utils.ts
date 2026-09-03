import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

export function formatRelativeTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateString)
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
}) {
  const businessName = workflow.business?.name || 'the business'
  const isHindi = workflow.language === 'hi'

  const fieldsDescription = (workflow.fields || [])
    .map(f => `- ${f.label} (${f.required ? 'required' : 'optional'})${f.options ? ': options are ' + f.options.join(', ') : ''}`)
    .join('\n')

  const conditionsDescription = (workflow.conditions || [])
    .map(c => `- If ${c.field} ${c.operator} "${c.value}": ${c.action_label}`)
    .join('\n')

  const greetingText = (workflow.greeting || 'Hello! Thank you for calling [Business Name]. How can I assist you today?').replace('[Business Name]', businessName)

  const closingText = (workflow.closing_message || 'Thank you for your time. Have a wonderful day!').replace('[Business Name]', businessName)

  return `You are a professional AI voice assistant for ${businessName}. Your role is to handle missed calls and collect customer information politely and efficiently.

LANGUAGE: ${isHindi ? 'Respond in Hindi (हिंदी). You can understand both Hindi and English.' : 'Respond in English. You can also understand Hindi if the customer speaks it.'}

GREETING: Start with: "${greetingText}"

YOUR TASK:
Collect the following information from the caller through natural conversation:
${fieldsDescription}

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
You have access to Google Calendar tools. Use them when:
- Customer wants to schedule a callback, appointment, or visit
- After collecting date/time preferences, check calendar availability
- Create events after customer confirmation
Tools available: check_calendar_availability, create_calendar_event, update_calendar_event, delete_calendar_event` : ''}

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

export function extractDataFromConversation(
  transcript: Array<{ role: string; content: string }>,
  fields: Array<{ key: string; label: string; type: string }>
): Record<string, string> {
  const data: Record<string, string> = {}
  const fullText = transcript
    .filter(m => m.role === 'assistant' || m.role === 'user')
    .map(m => `${m.role}: ${m.content}`)
    .join('\n')

  fields.forEach(field => {
    const patterns = [
      new RegExp(`${field.label}[:\\s]+([^\\n.]+)`, 'i'),
      new RegExp(`${field.key}[:\\s]+([^\\n.]+)`, 'i'),
    ]
    for (const pattern of patterns) {
      const match = fullText.match(pattern)
      if (match) {
        data[field.key] = match[1].trim()
        break
      }
    }
  })

  return data
}

export function detectUrgency(
  collectedData: Record<string, unknown>,
  conditions: Array<{ field: string; operator: string; value: string; action: string }>
): 'normal' | 'urgent' | 'low' {
  for (const condition of conditions) {
    if (condition.action !== 'mark_urgent') continue
    const fieldValue = String(collectedData[condition.field] || '').toLowerCase()
    const conditionValue = condition.value.toLowerCase()

    if (condition.operator === 'equals' && fieldValue === conditionValue) return 'urgent'
    if (condition.operator === 'contains' && fieldValue.includes(conditionValue)) return 'urgent'
  }
  return 'normal'
}
