import { NextRequest, NextResponse } from 'next/server'

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || ''
// Default to pre-made voices available on ElevenLabs free tier (Laura: FGY2WhTYpPnrIDTdsKH5)
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'FGY2WhTYpPnrIDTdsKH5'
const HINDI_VOICE_ID = process.env.ELEVENLABS_HINDI_VOICE_ID || 'FGY2WhTYpPnrIDTdsKH5'

export async function POST(request: NextRequest) {
  try {
    const { text, language, apiKey } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    const cleanText = text.slice(0, 500) // Limit length for free tier
    const activeKey = (apiKey && typeof apiKey === 'string' && apiKey.trim())
      ? apiKey.trim()
      : (process.env.ELEVENLABS_API_KEY || ELEVENLABS_API_KEY)

    // If no ElevenLabs key, return a mock audio response instruction
    if (!activeKey) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY not configured', mock: true },
        { status: 503 }
      )
    }

    let voiceId = language === 'hi' ? HINDI_VOICE_ID : DEFAULT_VOICE_ID

    let response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': activeKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: language === 'hi' ? 'eleven_multilingual_v2' : 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.1,
            use_speaker_boost: true,
          },
        }),
      }
    )

    // If voice fails with 402/400 (e.g. library voice requiring paid plan), retry with universal pre-made voice
    if (!response.ok && (response.status === 402 || response.status === 400) && voiceId !== 'FGY2WhTYpPnrIDTdsKH5') {
      voiceId = 'FGY2WhTYpPnrIDTdsKH5'
      response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': activeKey,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          body: JSON.stringify({
            text: cleanText,
            model_id: language === 'hi' ? 'eleven_multilingual_v2' : 'eleven_turbo_v2_5',
          }),
        }
      )
    }

    if (!response.ok) {
      const errText = await response.text()
      console.error('ElevenLabs TTS error:', response.status, errText)
      return NextResponse.json(
        { error: `ElevenLabs error: ${response.status}`, details: errText },
        { status: response.status }
      )
    }

    // Stream the audio back to the client
    const audioBuffer = await response.arrayBuffer()
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.byteLength),
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('TTS route error:', error)
    return NextResponse.json({ error: 'TTS generation failed' }, { status: 500 })
  }
}
