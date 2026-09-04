import { GoogleGenerativeAI } from '@google/generative-ai'

const geminiApiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''

export function getGeminiClient() {
  if (!geminiApiKey || geminiApiKey.includes('your_')) {
    return null
  }
  return new GoogleGenerativeAI(geminiApiKey)
}

export async function generateGeminiChatResponse(
  prompt: string,
  history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>
) {
  const genAI = getGeminiClient()
  if (!genAI) return null

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      generationConfig: { temperature: 0.3, maxOutputTokens: 250 }
    })
    const chat = model.startChat({ history })
    const result = await chat.sendMessage(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    console.warn('Gemini chat error, falling back:', error)
    return null
  }
}
