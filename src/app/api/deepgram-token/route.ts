import { NextRequest, NextResponse } from 'next/server'

const ENV_DEEPGRAM_KEY = process.env.DEEPGRAM_API_KEY || ''

export async function GET(request: NextRequest) {
  const customKey = request.nextUrl.searchParams.get('key') || request.headers.get('x-deepgram-key') || ''
  const activeKey = (customKey && customKey.trim()) ? customKey.trim() : ENV_DEEPGRAM_KEY

  if (!activeKey) {
    return NextResponse.json({ error: 'DEEPGRAM_API_KEY not configured' }, { status: 503 })
  }

  try {
    // If client supplied their own key, return it directly for browser WS connection
    if (customKey && customKey.trim()) {
      return NextResponse.json({ key: customKey.trim() })
    }

    // Create a temporary Deepgram key scoped to just STT usage
    const response = await fetch('https://api.deepgram.com/v1/projects', {
      headers: { Authorization: `Token ${activeKey}` },
    })

    if (!response.ok) {
      // Fall back to returning the main key if projects API is unavailable
      return NextResponse.json({ key: activeKey })
    }

    const { projects } = await response.json()
    const projectId = projects?.[0]?.project_id

    if (!projectId) {
      return NextResponse.json({ key: activeKey })
    }

    // Issue a 60-second scoped temporary key
    const keyResponse = await fetch(
      `https://api.deepgram.com/v1/projects/${projectId}/keys`,
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${activeKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: 'voiceai-browser-stt',
          scopes: ['usage:write'],
          time_to_live_in_seconds: 60,
        }),
      }
    )

    if (!keyResponse.ok) {
      return NextResponse.json({ key: activeKey })
    }

    const { key: tempKey } = await keyResponse.json()
    return NextResponse.json({ key: tempKey.key ?? activeKey })
  } catch {
    return NextResponse.json({ key: activeKey })
  }
}
