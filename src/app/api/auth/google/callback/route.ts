import { NextRequest, NextResponse } from 'next/server'
import { getTokensFromCode } from '@/lib/google-calendar'
import { verifyOAuthState } from '@/server/integrations/oauth-state'
import { encryptSecret, encryptionConfigured } from '@/server/integrations/encryption'
import { createClient } from '@/lib/supabase/server'
import { assertOwnsBusiness } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  // Before the state is verified we don't know which business this is for, so send generic
  // failures to the businesses list (calendar is now connected per-business, not in Settings).
  if (!code || !state) {
    return NextResponse.redirect(new URL('/businesses?error=google_auth_failed', request.url))
  }

  const parsed = verifyOAuthState(state)
  if (!parsed) {
    return NextResponse.redirect(new URL('/businesses?error=invalid_oauth_state', request.url))
  }

  // From here on we know the target business, so route the user back to its profile page.
  const businessUrl = (params: Record<string, string>) => {
    const url = new URL(`/businesses/${parsed.businessId}`, request.url)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    return url
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.id !== parsed.userId) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const owns = await assertOwnsBusiness(supabase, user.id, parsed.businessId)
  if (!owns) {
    return NextResponse.redirect(businessUrl({ error: 'forbidden' }))
  }

  if (!encryptionConfigured()) {
    return NextResponse.redirect(businessUrl({ error: 'encryption_key_missing' }))
  }

  try {
    const tokens = await getTokensFromCode(code)
    if (!tokens.access_token) {
      return NextResponse.redirect(businessUrl({ error: 'token_exchange_failed' }))
    }

    const { error } = await supabase.from('integrations').upsert(
      {
        business_id: parsed.businessId,
        provider: 'google_calendar',
        access_token_encrypted: encryptSecret(tokens.access_token),
        refresh_token_encrypted: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null,
        token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        scope: tokens.scope || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'business_id,provider' }
    )

    if (error) throw error

    return NextResponse.redirect(businessUrl({ google_connected: 'true' }))
  } catch {
    return NextResponse.redirect(businessUrl({ error: 'token_exchange_failed' }))
  }
}
