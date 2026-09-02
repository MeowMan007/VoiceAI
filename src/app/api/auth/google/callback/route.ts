import { NextRequest, NextResponse } from 'next/server'
import { getTokensFromCode } from '@/lib/google-calendar'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/settings?error=google_auth_failed', request.url))
  }

  try {
    const tokens = await getTokensFromCode(code)
    const redirectUrl = new URL('/settings', request.url)
    redirectUrl.searchParams.set('google_connected', 'true')
    redirectUrl.searchParams.set('access_token', tokens.access_token || '')
    redirectUrl.searchParams.set('refresh_token', tokens.refresh_token || '')

    const response = NextResponse.redirect(redirectUrl)
    response.cookies.set('google_access_token', tokens.access_token || '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600,
      path: '/'
    })

    if (tokens.refresh_token) {
      response.cookies.set('google_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 3600,
        path: '/'
      })
    }

    return response
  } catch {
    return NextResponse.redirect(new URL('/settings?error=token_exchange_failed', request.url))
  }
}
