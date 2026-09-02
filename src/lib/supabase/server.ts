import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

function isValidUrl(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const rawAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const rawService = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const defaultUrl = isValidUrl(rawUrl) ? rawUrl : 'https://demo.supabase.co'
const defaultAnon = rawAnon && !rawAnon.startsWith('your_') ? rawAnon : 'demo-anon-key'
const defaultService = rawService && !rawService.startsWith('your_') ? rawService : 'demo-service-key'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    defaultUrl,
    defaultAnon,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component - cookies can't be set
          }
        },
      },
    }
  )
}

export function createAdminClient() {
  return createSupabaseAdmin(defaultUrl, defaultService)
}
