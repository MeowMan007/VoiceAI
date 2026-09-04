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

function cleanSchemaForGemini(schema: unknown): unknown {
  if (!schema || typeof schema !== 'object') return schema
  if (Array.isArray(schema)) return schema.map(cleanSchemaForGemini)
  const copy: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(schema as Record<string, unknown>)) {
    if (k === 'additionalProperties') continue
    copy[k] = cleanSchemaForGemini(v)
  }
  return copy
}

function openaiToolsToGemini(tools: OpenAI.Chat.ChatCompletionTool[]) {
  return [
    {
      functionDeclarations: tools.map(t => ({
        name: t.function.name,
        description: t.function.description,
        parameters: cleanSchemaForGemini(t.function.parameters) as Record<string, unknown>,
      })),
    },
  ]
}

function sanitizeGeminiModel(model?: string): string {
  if (!model) return 'gemini-3.6-flash'
  if (model.includes('1.5') || model.includes('2.0') || model.includes('2.5') || model.includes('gemini-pro')) {
    return 'gemini-3.6-flash'
  }
  return model
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
          parts: m.tool_calls.map(tc => {
            const raw = (tc as any)._rawPart
            if (raw) return raw
            let args: Record<string, unknown> = {}
            try {
              args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments || '{}') : (tc.function.arguments || {})
            } catch {
              args = {}
            }
            return {
              functionCall: {
                name: tc.function.name,
                args,
              },
            }
          }),
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

  const modelName = sanitizeGeminiModel(options?.model)
  let model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
    tools: tools?.length ? (openaiToolsToGemini(tools) as never) : undefined,
  })

  const contents = toGeminiContents(messages)
  let result
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      result = await model.generateContent({ contents: contents as never })
      break
    } catch (err: any) {
      const isOverloaded = err?.status === 503 || err?.message?.includes('503') || err?.message?.includes('high demand') || err?.message?.includes('overloaded')
      if (isOverloaded && attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 800 * (attempt + 1)))
        continue
      }
    }
  }

  if (!result) {
    throw new Error('Gemini failed to generate a response')
  }

  const functionCalls = result.response.functionCalls?.() || []
  const rawParts = result.response.candidates?.[0]?.content?.parts || []

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
          id: (fc as any).id || `gemini_${Date.now()}_${i}`,
          type: 'function' as const,
          function: {
            name: fc.name,
            arguments: JSON.stringify(fc.args || {}),
          },
          _rawPart: rawParts[i] || { functionCall: fc },
        })) as any,
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
  const isGeminiAvailable = geminiConfigured(options?.apiKey)
  const isOpenAIAvailable = openaiConfigured(options?.apiKey)

  // Explicit provider choice
  if (preferred === 'gemini' && isGeminiAvailable) {
    try {
      return await completeGemini(messages, tools, options)
    } catch (err) {
      console.warn('Gemini complete failed:', err)
    }
  }

  if (preferred === 'openai' && isOpenAIAvailable) {
    try {
      return await completeOpenAI(messages, tools, options)
    } catch (err) {
      console.warn('OpenAI complete failed:', err)
    }
  }

  // Default: Prioritize Gemini when configured (per user request: "instead of using chatgpt api, i have used gemini api key")
  if (isGeminiAvailable && preferred !== 'simulator' && preferred !== 'openai') {
    try {
      return await completeGemini(messages, tools, options)
    } catch (err) {
      console.warn('Gemini primary complete failed, trying fallback:', err)
    }
  }

  // Fallback to OpenAI if configured
  if (isOpenAIAvailable && preferred !== 'simulator') {
    try {
      return await completeOpenAI(messages, tools, options)
    } catch (err) {
      console.warn('OpenAI complete failed:', err)
    }
  }

  // Fallback to deterministic simulator
  return generateSimulatedResponse(messages, tools)
}

export function hasLlmProvider(options?: GenerateOptions) {
  return geminiConfigured(options?.apiKey) || openaiConfigured(options?.apiKey)
}
