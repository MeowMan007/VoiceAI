import type OpenAI from 'openai'
import type { WorkflowField } from '@/types'

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
      description: 'Query the delivery tracking API using an order ID or tracking number (e.g. ORD-101, TRK-902)',
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

function fieldToJsonSchema(field: WorkflowField) {
  const description = `${field.label}${field.required ? ' (required)' : ''}`
  if (field.type === 'number') {
    return { type: 'number', description }
  }
  if (field.type === 'boolean') {
    return { type: 'boolean', description }
  }
  if (field.type === 'select' && field.options?.length) {
    return { type: 'string', enum: field.options, description }
  }
  return { type: 'string', description }
}

export function buildDataCaptureTool(fields: WorkflowField[]): OpenAI.Chat.ChatCompletionTool {
  const properties = Object.fromEntries(
    (fields || []).map(f => [f.key, fieldToJsonSchema(f)])
  )

  return {
    type: 'function',
    function: {
      name: 'save_customer_data',
      description:
        'Call this whenever you have confidently captured one or more field values from the customer. Partial objects are allowed.',
      parameters: {
        type: 'object',
        properties,
        additionalProperties: false,
      },
    },
  }
}

export function buildAgentTools(fields: WorkflowField[], calendarEnabled: boolean): OpenAI.Chat.ChatCompletionTool[] {
  const tools: OpenAI.Chat.ChatCompletionTool[] = [buildDataCaptureTool(fields)]
  if (calendarEnabled) {
    tools.push(...CALENDAR_TOOLS.filter(t => t.function.name !== 'lookup_delivery_status'))
  }
  tools.push(CALENDAR_TOOLS.find(t => t.function.name === 'lookup_delivery_status')!)
  return tools
}
