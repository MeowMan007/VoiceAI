import OpenAI from 'openai'
import { generateSimulatedResponse } from '@/server/ai/fallback'

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_call_id?: string
  tool_calls?: OpenAI.Chat.ChatCompletionMessageToolCall[]
}

export interface GenerateOptions {
  provider?: 'gemini' | 'openai' | 'simulator'
  apiKey?: string
  model?: string
}

function hasRealKey(key?: string) {
  return !!key && !key.includes('your_') && key !== 'dummy_key_for_build'
}

function openaiConfigured(custom?: string) {
  return hasRealKey(custom || process.env.OPENAI_API_KEY)
}

function geminiConfigured(custom?: string) {
  return hasRealKey(custom || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY)
}

function toOpenAIMessages(messages: ChatMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
  return messages.map(m => {
    if (m.role === 'tool') {
      return {
        role: 'tool',
        tool_call_id: m.tool_call_id || '',
        content: m.content || '',
      }
    }
    if (m.role === 'assistant' && m.tool_calls?.length) {
      return {
        role: 'assistant',
        content: m.content,
        tool_calls: m.tool_calls,
      }
    }
    return {
      role: m.role,
      content: m.content || '',
    }
  }) as OpenAI.Chat.ChatCompletionMessageParam[]
}

function openaiToolsToGemini(tools: OpenAI.Chat.ChatCompletionTool[]) {
  return [
    {
      functionDeclarations: tools.map(t => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters as Record<string, unknown>,
      })),
    },
  ]
}

function toGeminiContents(messages: ChatMessage[]) {
  const contents: Array<{ role: 'user' | 'model'; parts: Array<Record<string, unknown>> }> = []
  const toolNames: Record<string, string> = {}

  for (const m of messages) {
    if (m.role === 'system') continue
    if (m.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: m.content || '' }] })
      continue
    }
    if (m.role === 'assistant') {
      if (m.tool_calls?.length) {
        for (const tc of m.tool_calls) {
          toolNames[tc.id] = tc.function.name
        }
        contents.push({
          role: 'model',
          parts: m.tool_calls.map(tc => ({
            functionCall: {
              name: tc.function.name,
              args: JSON.parse(tc.function.arguments || '{}'),
            },
          })),
        })
      } else {
        contents.push({ role: 'model', parts: [{ text: m.content || '' }] })
      }
      continue
    }
    if (m.role === 'tool') {
      const name = toolNames[m.tool_call_id || ''] || 'unknown'
      let response: Record<string, unknown> = { result: m.content }
      try {
        response = JSON.parse(m.content || '{}')
      } catch {
        /* keep */
      }
      contents.push({
        role: 'user',
        parts: [{ functionResponse: { name, response } }],
      })
    }
  }

  return contents
}

async function completeOpenAI(
  messages: ChatMessage[],
  tools: OpenAI.Chat.ChatCompletionTool[] | undefined,
  options?: GenerateOptions
): Promise<OpenAI.Chat.ChatCompletion.Choice> {
  const key = options?.apiKey?.trim() || process.env.OPENAI_API_KEY || ''
  const client = new OpenAI({ apiKey: key })
  const response = await client.chat.completions.create({
    model: options?.model || 'gpt-4o',
    messages: toOpenAIMessages(messages),
    tools: tools?.length ? tools : undefined,
    tool_choice: tools?.length ? 'auto' : undefined,
    temperature: 0.7,
    max_tokens: 700,
  })
  return response.choices[0]
}

async function completeGemini(
  messages: ChatMessage[],
  tools: OpenAI.Chat.ChatCompletionTool[] | undefined,
  options?: GenerateOptions
): Promise<OpenAI.Chat.ChatCompletion.Choice> {
  const geminiKey =
    options?.apiKey?.trim() || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genAI = new GoogleGenerativeAI(geminiKey)
  const systemInstruction = messages.find(m => m.role === 'system')?.content || undefined

  const model = genAI.getGenerativeModel({
    model: options?.model || 'gemini-2.5-flash',
    systemInstruction,
    tools: tools?.length ? (openaiToolsToGemini(tools) as never) : undefined,
  })

  const contents = toGeminiContents(messages)
  const result = await model.generateContent({ contents: contents as never })
  const functionCalls = result.response.functionCalls?.() || []

  if (functionCalls.length) {
    return {
      index: 0,
      finish_reason: 'tool_calls',
      logprobs: null,
      message: {
        role: 'assistant',
        content: null,
        refusal: null,
        tool_calls: functionCalls.map((fc, i) => ({
          id: `gemini_${Date.now()}_${i}`,
          type: 'function' as const,
          function: {
            name: fc.name,
            arguments: JSON.stringify(fc.args || {}),
          },
        })),
      },
    }
  }

  const text = result.response.text()
  return {
    index: 0,
    finish_reason: 'stop',
    logprobs: null,
    message: {
      role: 'assistant',
      content: text,
      refusal: null,
      tool_calls: undefined,
    },
  }
}

export async function completeChat(
  messages: ChatMessage[],
  tools?: OpenAI.Chat.ChatCompletionTool[],
  options?: GenerateOptions
): Promise<OpenAI.Chat.ChatCompletion.Choice> {
  const preferred = options?.provider
  const tryOpenAI = preferred === 'openai' || (!preferred && openaiConfigured(options?.apiKey)) || (preferred !== 'gemini' && openaiConfigured(options?.apiKey))
  const tryGemini = preferred === 'gemini' || (!preferred && geminiConfigured(options?.apiKey)) || geminiConfigured(options?.apiKey)

  if (preferred === 'openai' && openaiConfigured(options?.apiKey)) {
    try {
      return await completeOpenAI(messages, tools, options)
    } catch (err) {
      console.warn('OpenAI complete failed:', err)
    }
  } else if (preferred !== 'gemini' && openaiConfigured(options?.apiKey) && tryOpenAI) {
    try {
      return await completeOpenAI(messages, tools, options)
    } catch (err) {
      console.warn('OpenAI complete failed:', err)
    }
  }

  if (tryGemini && geminiConfigured(options?.apiKey) && preferred !== 'simulator') {
    try {
      return await completeGemini(messages, tools, options)
    } catch (err) {
      console.warn('Gemini complete failed:', err)
    }
  }

  if (preferred !== 'openai' && openaiConfigured(options?.apiKey)) {
    try {
      return await completeOpenAI(messages, tools, options)
    } catch (err) {
      console.warn('OpenAI fallback failed:', err)
    }
  }

  return generateSimulatedResponse(messages, tools)
}

export function hasLlmProvider(options?: GenerateOptions) {
  return openaiConfigured(options?.apiKey) || geminiConfigured(options?.apiKey)
}
