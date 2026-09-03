import OpenAI from 'openai'

const apiKey = process.env.OPENAI_API_KEY || 'dummy_key_for_build'
const openai = new OpenAI({ apiKey })

export async function generateSummary(
  transcript: Array<{ role: string; content: string }>,
  collectedData: Record<string, unknown>,
  businessType: string
): Promise<string> {
  const transcriptText = transcript
    .map(m => `${m.role === 'assistant' ? 'Assistant' : 'Customer'}: ${m.content}`)
    .join('\n')

  const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (geminiKey && !geminiKey.includes('your_')) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(geminiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
      const prompt = `You are a business assistant. Summarize this customer conversation for a ${businessType} business owner in 2-3 concise sentences. Focus on what the customer needed, captured details, and priority.\n\nConversation:\n${transcriptText}\n\nCollected Data:\n${JSON.stringify(collectedData, null, 2)}`
      const result = await model.generateContent(prompt)
      return result.response.text() || 'Customer called and left details.'
    } catch (err) {
      console.warn('Gemini summary failed, using fallback summary:', err)
    }
  }

  if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your_') && process.env.OPENAI_API_KEY !== 'dummy_key_for_build') {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a business assistant. Summarize this customer conversation for a ${businessType} business owner in 2-3 sentences. Focus on what the customer needs and any important details.`,
          },
          {
            role: 'user',
            content: `Conversation:\n${transcriptText}\n\nCollected Data:\n${JSON.stringify(collectedData, null, 2)}`,
          },
        ],
        temperature: 0.5,
        max_tokens: 200,
      })
      return response.choices[0].message.content || 'Customer called and left details.'
    } catch {
      // ignore
    }
  }

  const callerNeeds = Object.entries(collectedData)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')
  return `Customer called regarding ${businessType.replace('_', ' ')}. Captured details: ${callerNeeds || 'enquiry logged'}. Follow-up scheduled.`
}

export { openai }
