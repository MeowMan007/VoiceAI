import { NextRequest, NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/google-calendar'

export async function GET(request: NextRequest) {
  const authUrl = getAuthUrl()
  return NextResponse.redirect(authUrl)
}
