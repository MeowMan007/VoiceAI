import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

const defaultUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://demo.supabase.co'
const defaultAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo-anon-key'
const defaultService = process.env.SUPABASE_SERVICE_ROLE_KEY || 'demo-service-key'

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
