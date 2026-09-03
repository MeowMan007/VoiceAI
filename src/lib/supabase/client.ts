import { createBrowserClient } from '@supabase/ssr'

function isValidUrl(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

// Hosts that are placeholders, not real projects. `demo.supabase.co` shipped as a
// stand-in in older env templates; treating it as "configured" is what produced the
// opaque "Failed to fetch" on sign-in/up.
function isPlaceholderUrl(url: string) {
  return url === 'https://demo.supabase.co' || url.includes('demo.supabase.co')
}

/**
 * Whether real Supabase credentials are present. The auth pages check this before
 * attempting a request so misconfiguration surfaces as a clear, actionable message
 * instead of a network-level "Failed to fetch".
 */
export function isSupabaseConfigured(): boolean {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
  if (!url || !key) return false
  if (url.startsWith('your_') || key.startsWith('your_')) return false
  if (!isValidUrl(url) || isPlaceholderUrl(url)) return false
  return true
}

/**
 * The anon/publishable key belongs in the browser; a `sb_secret_…` (or legacy
 * service-role) key here both leaks a secret to the client and is rejected by
 * Supabase Auth. This is a soft warning — it does not block, but it explains a
 * likely-misconfigured key.
 */
export function supabaseKeyLooksLikeSecret(): boolean {
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
  return key.startsWith('sb_secret_')
}

export function createClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

  // Do NOT silently substitute a fake project — that masks misconfiguration. Callers
  // gate on isSupabaseConfigured() first; if something bypasses that check, point at an
  // unresolvable host so it fails fast and obviously rather than at a real project.
  return createBrowserClient(
    isValidUrl(url) && !isPlaceholderUrl(url) ? url : 'https://unconfigured.invalid',
    key || 'unconfigured'
  )
}
