import crypto from 'node:crypto'

function secret() {
  const configured =
    process.env.GOOGLE_OAUTH_STATE_SECRET ||
    process.env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY ||
    process.env.NEXTAUTH_SECRET
  if (configured) return configured
  // Never sign real OAuth state with a hardcoded secret in production.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'GOOGLE_OAUTH_STATE_SECRET (or INTEGRATION_CREDENTIALS_ENCRYPTION_KEY) must be set in production to sign OAuth state.'
    )
  }
  return 'dev-oauth-state-secret'
}

export function signOAuthState(payload: { businessId: string; userId: string; exp: number }) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyOAuthState(state: string): { businessId: string; userId: string } | null {
  const [body, sig] = state.split('.')
  if (!body || !sig) return null
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      businessId: string
      userId: string
      exp: number
    }
    if (parsed.exp < Date.now()) return null
    if (!parsed.businessId || !parsed.userId) return null
    return { businessId: parsed.businessId, userId: parsed.userId }
  } catch {
    return null
  }
}
