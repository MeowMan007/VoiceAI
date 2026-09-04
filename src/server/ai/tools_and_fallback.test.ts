import assert from 'node:assert/strict'
import test from 'node:test'
import { generateSimulatedResponse } from './fallback.ts'

test('generateSimulatedResponse invokes lookup_delivery_order tool when user asks about order', () => {
  const tools = [
    {
      type: 'function' as const,
      function: {
        name: 'lookup_delivery_order',
        description: 'Lookup order',
        parameters: {},
      },
    },
  ]

  const choice = generateSimulatedResponse(
    [
      { role: 'user', content: 'Where is my order ORD-101?' },
    ],
    tools
  )

  assert.equal(choice.finish_reason, 'tool_calls')
  assert.ok(choice.message.tool_calls && choice.message.tool_calls.length > 0)
  assert.equal(choice.message.tool_calls[0].function.name, 'lookup_delivery_order')
  const args = JSON.parse(choice.message.tool_calls[0].function.arguments)
  assert.equal(args.tracking_number, 'ORD-101')
})

test('generateSimulatedResponse formats tool result for delivery order nicely', () => {
  const choice = generateSimulatedResponse([
    { role: 'user', content: 'Where is my order ORD-101?' },
    {
      role: 'assistant',
      content: null,
      tool_calls: [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'lookup_delivery_order',
            arguments: '{"tracking_number":"ORD-101"}',
          },
        },
      ],
    },
    {
      role: 'tool',
      tool_call_id: 'call_1',
      content: JSON.stringify({
        found: true,
        order_id: 'ORD-101',
        status: 'out_for_delivery',
        eta: 'Today by 4:00 PM',
        driver_name: 'Rajesh Kumar',
      }),
    },
  ])

  assert.equal(choice.finish_reason, 'stop')
  assert.ok(choice.message.content?.includes('ORD-101'))
  assert.ok(choice.message.content?.includes('out for delivery') || choice.message.content?.includes('Rajesh'))
})

test('generateSimulatedResponse invokes check_calendar_availability for appointment requests', () => {
  const tools = [
    {
      type: 'function' as const,
      function: {
        name: 'check_calendar_availability',
        description: 'Check calendar',
        parameters: {},
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'create_calendar_event',
        description: 'Create calendar event',
        parameters: {},
      },
    },
  ]

  const choice = generateSimulatedResponse(
    [
      { role: 'user', content: 'I need an appointment with Dr. Sharma tomorrow at 3 PM' },
    ],
    tools
  )

  assert.equal(choice.finish_reason, 'tool_calls')
  assert.equal(choice.message.tool_calls?.[0]?.function.name, 'check_calendar_availability')
})

test('generateSimulatedResponse responds in Hindi when user speaks Hindi', () => {
  const choice = generateSimulatedResponse([
    { role: 'user', content: 'नमस्ते, मुझे कल के लिए 1 किलो चॉकलेट केक चाहिए' },
  ])

  assert.equal(choice.finish_reason, 'stop')
  // Hindi Unicode range or Hindi words
  const hasHindi = /[\u0900-\u097F]/.test(choice.message.content || '')
  assert.ok(hasHindi, 'Response should contain Hindi characters')
})
