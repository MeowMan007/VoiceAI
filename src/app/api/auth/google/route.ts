import { NextRequest, NextResponse } from 'next/server'
import { requireUser, assertOwnsBusiness } from '@/lib/auth'
import { getAuthUrl } from '@/lib/google-calendar'
import { signOAuthState } from '@/server/integrations/oauth-state'

export async function GET(request: NextRequest) {
  const auth = await requireUser()
  if (auth.error) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const businessId = request.nextUrl.searchParams.get('business_id')
  if (!businessId) {
    return NextResponse.redirect(new URL('/businesses?error=missing_business', request.url))
  }

  const owns = await assertOwnsBusiness(auth.supabase, auth.user.id, businessId)
  if (!owns) {
    return NextResponse.redirect(new URL(`/businesses/${businessId}?error=forbidden`, request.url))
  }

  const state = signOAuthState({
    businessId,
    userId: auth.user.id,
    exp: Date.now() + 10 * 60 * 1000,
  })

  return NextResponse.redirect(getAuthUrl(state))
}
