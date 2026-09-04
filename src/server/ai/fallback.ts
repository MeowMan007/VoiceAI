import type OpenAI from 'openai'
import type { ChatMessage } from '@/server/ai/llm'

/**
 * Intelligent simulated conversation & tool-calling engine.
 * Decides tool execution and formulates human-like voice responses
 * across Cake Shop, Clinic (Google Calendar), Delivery, Real Estate, and Repair services.
 * Fully supports English and Hindi (हिंदी).
 */
export function generateSimulatedResponse(
  messages: ChatMessage[],
  tools?: OpenAI.Chat.ChatCompletionTool[]
): OpenAI.Chat.ChatCompletion.Choice {
  const hasTool = (name: string) => tools?.some(t => t.type === 'function' && t.function.name === name)

  // 1. Check if the latest message is a tool response
  const lastMsg = messages[messages.length - 1]
  if (lastMsg && lastMsg.role === 'tool') {
    let toolResult: Record<string, any> = {}
    try {
      toolResult = JSON.parse(lastMsg.content || '{}')
    } catch {
      toolResult = { raw: lastMsg.content }
    }

    // Find what tool was called from the preceding assistant message
    const prevAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.tool_calls?.length)
    const calledTool = prevAssistantMsg?.tool_calls?.[0]?.function.name

    // Check language context
    const userMsgs = messages.filter(m => m.role === 'user')
    const lastUserText = userMsgs[userMsgs.length - 1]?.content || ''
    const isHindi = /[\u0900-\u097F]/.test(lastUserText) ||
      lastUserText.toLowerCase().includes('hindi') ||
      lastUserText.toLowerCase().includes('नमस्ते') ||
      lastUserText.toLowerCase().includes('चाहिए')

    // If check_calendar_availability was called, chain to create_calendar_event if available
    if (calledTool === 'check_calendar_availability') {
      if (toolResult.available !== false && hasTool('create_calendar_event')) {
        let args: Record<string, any> = {}
        try {
          args = JSON.parse(prevAssistantMsg?.tool_calls?.[0]?.function.arguments || '{}')
        } catch {
          args = {}
        }
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
                id: `call_create_cal_${Date.now()}`,
                type: 'function',
                function: {
                  name: 'create_calendar_event',
                  arguments: JSON.stringify({
                    title: args.title || 'Doctor Appointment / Callback',
                    date: args.date || new Date(Date.now() + 86400000).toISOString().split('T')[0],
                    time: args.time || '16:00',
                    duration_minutes: args.duration_minutes || 30,
                    description: 'Scheduled via Voice AI Assistant',
                  }),
                },
              },
            ],
          },
        }
      }

      const dateStr = toolResult.date || 'tomorrow'
      const timeStr = toolResult.time || '4:00 PM'
      const reply = isHindi
        ? `मैंने कैलेंडर चेक किया है। ${dateStr} को ${timeStr} पर समय उपलब्ध है! क्या मैं आपकी अपॉइंटमेंट कन्फर्म कर दूँ?`
        : `I checked the calendar and ${timeStr} on ${dateStr} is available! Would you like me to confirm this booking for you?`
      return makeTextChoice(reply)
    }

    if (calledTool === 'create_calendar_event') {
      const dateStr = toolResult.date || 'tomorrow'
      const timeStr = toolResult.time || '4:00 PM'
      const reply = isHindi
        ? `आपकी अपॉइंटमेंट सफलतापूर्वक गूगल कैलेंडर में दर्ज हो गई है (${timeStr}, ${dateStr})। हमारी टीम आपसे जल्द मिलेगी!`
        : `Your appointment has been successfully scheduled on Google Calendar for ${timeStr}! We have locked this slot for you and sent a confirmation.`
      return makeTextChoice(reply)
    }

    if (calledTool === 'lookup_delivery_status' || calledTool === 'lookup_delivery_order') {
      const orderId = toolResult.order_id || toolResult.tracking_number || 'ORD-101'
      const rawStatus = toolResult.status || 'Out for Delivery'
      const status = rawStatus.replace(/_/g, ' ')
      const eta = toolResult.eta || 'Today by 4:30 PM'
      const loc = toolResult.location || 'Local Delivery Center'
      const driver = toolResult.driver_name ? ` Driver: ${toolResult.driver_name}.` : ''
      const reply = isHindi
        ? `ऑर्डर ${orderId} की स्थिति: "${status}" है। यह अभी ${loc} पर है और ${eta} तक पहुँचने की उम्मीद है।${driver}`
        : `Order ${orderId} is currently "${status}"! Current location: ${loc}. Expected arrival: ${eta}.${driver} Is there anything else you need?`
      return makeTextChoice(reply)
    }

    if (calledTool === 'save_customer_data') {
      const data = toolResult
      if (data.flavour || data.weight || data.order_type) {
        const weightText = data.weight ? `${data.weight}kg ` : ''
        const flavourText = data.flavour || 'custom'
        const reply = isHindi
          ? `मैंने आपका ${weightText}${flavourText} केक का ऑर्डर नोट कर लिया है। क्या आप डिलीवरी या पिकअप चुनना चाहेंगे?`
          : `I've noted your order for a ${weightText}${flavourText} cake! Would you prefer home delivery or bakery pickup?`
        return makeTextChoice(reply)
      }
      if (data.urgency === 'Emergency' || data.urgency === 'Urgent') {
        const reply = isHindi
          ? 'मैंने आपकी आपातकालीन सेवा को उच्च प्राथमिकता (High Urgency) पर दर्ज कर लिया है। हमारा तकनीशियन जल्द पहुंचेगा।'
          : "I have flagged your request as URGENT PRIORITY. Our technician has been notified for immediate follow-up. What is your address?"
        return makeTextChoice(reply)
      }
    }

    // Default after tool execution
    const fallbackAfterTool = isHindi
      ? 'धन्यवाद! आपकी जानकारी दर्ज कर ली गई है। क्या मैं आपकी किसी और चीज़ में सहायता करूँ?'
      : 'Thank you! I have saved all the details for your request. Is there anything else you would like assistance with?'
    return makeTextChoice(fallbackAfterTool)
  }

  // 2. Evaluate User's message intent
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || ''
  const lower = lastUserMsg.toLowerCase()
  const isHindi = /[\u0900-\u097F]/.test(lastUserMsg) ||
    lower.includes('hindi') ||
    lower.includes('नमस्ते') ||
    lower.includes('चाहिए') ||
    lower.includes('किलो') ||
    lower.includes('केक')

  // Check if calendar tool has already been run in this conversation
  const calendarAlreadyRun = messages.some(
    m => m.role === 'assistant' && m.tool_calls?.some(tc => tc.function.name === 'create_calendar_event')
  )

  // Scheduling / Appointment / Calendar intent
  const isScheduleRequest =
    (lower.includes('schedule') ||
      lower.includes('appointment') ||
      lower.includes('callback') ||
      lower.includes('book') ||
      lower.includes('visit') ||
      lower.includes('doctor') ||
      lower.includes('sharma') ||
      lower.includes('site visit') ||
      lower.includes('4 pm') ||
      lower.includes('4pm') ||
      lower.includes('tomorrow')) &&
    (hasTool('check_calendar_availability') || hasTool('create_calendar_event'))

  if (isScheduleRequest && !calendarAlreadyRun) {
    const timeMatch = lastUserMsg.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i)
    const timeStr = timeMatch ? timeMatch[1] : '16:00'
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

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
            id: `call_cal_${Date.now()}`,
            type: 'function',
            function: {
              name: 'check_calendar_availability',
              arguments: JSON.stringify({
                title: lower.includes('doctor') || lower.includes('sharma') ? 'Clinic Appointment with Dr. Sharma' : 'Customer Callback / Appointment',
                date: tomorrow,
                time: timeStr.toLowerCase().includes('pm') ? '16:00' : '10:00',
                duration_minutes: 30,
              }),
            },
          },
        ],
      },
    }
  }

  // Delivery / Tracking request
  const isTrackingRequest =
    lower.includes('track') ||
    lower.includes('ord-') ||
    lower.includes('trk-') ||
    lower.includes('delivery status') ||
    lower.includes('order status')

  const trackingTool = hasTool('lookup_delivery_status')
    ? 'lookup_delivery_status'
    : hasTool('lookup_delivery_order')
    ? 'lookup_delivery_order'
    : null

  if (isTrackingRequest && trackingTool) {
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
            id: `call_track_${Date.now()}`,
            type: 'function',
            function: {
              name: trackingTool,
              arguments: JSON.stringify(trackingTool === 'lookup_delivery_order' ? { tracking_number: orderId } : { order_id: orderId }),
            },
          },
        ],
      },
    }
  }

  // Cake shop order request
  const isCakeOrder =
    lower.includes('cake') ||
    lower.includes('truffle') ||
    lower.includes('chocolate') ||
    lower.includes('birthday') ||
    lower.includes('flavour') ||
    lower.includes('flavor') ||
    lower.includes('kg') ||
    lower.includes('केक')

  if (isCakeOrder && hasTool('save_customer_data')) {
    const weightMatch = lastUserMsg.match(/(\d+(?:\.\d+)?)\s*(?:kg|किलो)/i)
    const weight = weightMatch ? weightMatch[1] : '1'
    const flavour = lower.includes('chocolate') || lower.includes('चॉकलेट') ? 'Chocolate Truffle' : lower.includes('red velvet') ? 'Red Velvet' : 'Custom Cake'
    const isUrgent = lower.includes('urgent') || lower.includes('tomorrow') || lower.includes('कल') || lower.includes('morning')

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
            id: `call_cake_${Date.now()}`,
            type: 'function',
            function: {
              name: 'save_customer_data',
              arguments: JSON.stringify({
                order_type: 'Custom Cake Order',
                flavour,
                weight,
                required_date: isUrgent ? 'Within 24 Hours (Urgent)' : 'Standard',
                urgency: isUrgent ? 'Urgent' : 'Normal',
              }),
            },
          },
        ],
      },
    }
  }

  // Repair / Emergency service request
  const isRepairRequest =
    lower.includes('repair') ||
    lower.includes('pipe') ||
    lower.includes('burst') ||
    lower.includes('leak') ||
    lower.includes('emergency') ||
    lower.includes('plumber') ||
    lower.includes('electrician')

  if (isRepairRequest && hasTool('save_customer_data')) {
    const isEmergency = lower.includes('emergency') || lower.includes('burst') || lower.includes('immediately')
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
            id: `call_repair_${Date.now()}`,
            type: 'function',
            function: {
              name: 'save_customer_data',
              arguments: JSON.stringify({
                service_type: lower.includes('pipe') || lower.includes('leak') ? 'Plumbing' : 'Home Repair',
                issue_description: lastUserMsg,
                urgency: isEmergency ? 'Emergency' : 'Urgent',
              }),
            },
          },
        ],
      },
    }
  }

  // Real estate enquiry
  const isRealEstate =
    lower.includes('bhk') ||
    lower.includes('property') ||
    lower.includes('flat') ||
    lower.includes('apartment') ||
    lower.includes('rent') ||
    lower.includes('buy') ||
    lower.includes('site visit')

  if (isRealEstate && hasTool('save_customer_data')) {
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
            id: `call_re_${Date.now()}`,
            type: 'function',
            function: {
              name: 'save_customer_data',
              arguments: JSON.stringify({
                interest_type: lower.includes('rent') ? 'Rent' : 'Buy',
                property_type: lower.includes('villa') ? 'Villa' : 'Apartment',
                requirements: lastUserMsg,
              }),
            },
          },
        ],
      },
    }
  }

  // Natural dialogue responses
  let reply = "I've noted that down for you. Could you also share your contact name and preferred timing?"
  if (isHindi) {
    if (lower.includes('नमस्ते') || lower.includes('हेलो') || lower.includes('हाय')) {
      reply = 'नमस्ते! मैं आपकी वॉइस एआई असिस्टेंट हूँ। आज मैं आपकी क्या सहायता कर सकती हूँ?'
    } else if (lower.includes('धन्यवाद') || lower.includes('शुक्रिया') || lower.includes('बाय')) {
      reply = 'आपका बहुत-बहुत धन्यवाद! हमने आपकी सारी जानकारी दर्ज कर ली है। हमारी टीम आपसे जल्द ही संपर्क करेगी। आपका दिन शुभ हो!'
    } else {
      reply = 'जी बिल्कुल, मैंने आपकी जानकारी नोट कर ली है। क्या आप अपना नाम और संपर्क नंबर बता सकते हैं?'
    }
  } else {
    if (lower.includes('thank') || lower.includes('bye') || lower.includes('ok')) {
      reply = "Thank you for reaching out! We've captured all your details and our team will follow up with you promptly. Have a wonderful day!"
    } else if (lower.includes('hello') || lower.includes('hi')) {
      reply = "Hello! I'm your Voice AI Assistant. How can I assist you with your request today?"
    }
  }

  return makeTextChoice(reply)
}

function makeTextChoice(content: string): OpenAI.Chat.ChatCompletion.Choice {
  return {
    index: 0,
    finish_reason: 'stop',
    logprobs: null,
    message: {
      role: 'assistant',
      content,
      refusal: null,
    },
  }
}
