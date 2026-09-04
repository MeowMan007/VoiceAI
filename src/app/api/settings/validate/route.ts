import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { provider, apiKey, model } = await request.json()

    if (!apiKey || apiKey.trim() === '') {
      return NextResponse.json({ success: false, message: 'API key cannot be empty' }, { status: 400 })
    }

    if (provider === 'gemini') {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(apiKey)
      const selectedModel = model || 'gemini-3.1-flash-lite'
      const m = genAI.getGenerativeModel({ model: selectedModel })
      
      const response = await m.generateContent('Ping test. Reply with "OK".')
      const text = response.response.text()
      
      return NextResponse.json({
        success: true,
        message: `Connected successfully to Google Gemini (${selectedModel})! Response: ${text.trim().slice(0, 30)}`
      })
    } else if (provider === 'openai') {
      const OpenAI = (await import('openai')).default
      const client = new OpenAI({ apiKey })
      const selectedModel = model || 'gpt-4o-mini'

      const response = await client.chat.completions.create({
        model: selectedModel,
        messages: [{ role: 'user', content: 'Ping' }],
        max_tokens: 5
      })

      return NextResponse.json({
        success: true,
        message: `Connected successfully to OpenAI (${selectedModel})!`
      })
    }

    return NextResponse.json({ success: false, message: 'Unsupported provider' }, { status: 400 })
  } catch (err: unknown) {
    const error = err as Error
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to authenticate with provider. Please check the key.'
    }, { status: 400 })
  }
}
