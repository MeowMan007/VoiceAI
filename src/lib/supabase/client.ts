import { createBrowserClient } from '@supabase/ssr'

function isValidUrl(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  const url = isValidUrl(rawUrl) ? rawUrl : 'https://demo.supabase.co'
  const key = rawKey && !rawKey.startsWith('your_') ? rawKey : 'demo-anon-key'

  return createBrowserClient(url, key)
}
