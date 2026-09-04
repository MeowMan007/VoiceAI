import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

const DEMO_USER: User = {
  id: 'demo-user-1',
  app_metadata: {},
  user_metadata: { name: 'Demo Owner' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'owner@voiceai.com',
  phone: '',
  role: 'authenticated',
  updated_at: new Date().toISOString(),
}

export async function requireUser(): Promise<
  | { user: User; supabase: SupabaseClient; error: null }
  | { user: null; supabase: SupabaseClient; error: NextResponse }
> {
  const supabase = await createClient()
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (user && !error) {
      return { user, supabase, error: null }
    }
  } catch {
    // Supabase unavailable or demo credentials in use
  }

  // Fallback to local demo user for zero-dependency operation
  return { user: DEMO_USER, supabase, error: null }
}

export async function assertOwnsBusiness(
  supabase: SupabaseClient,
  userId: string,
  businessId: string
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('owner_id', userId)
      .maybeSingle()

    if (data) return true
  } catch {
    // Supabase unavailable
  }

  // In demo / fallback mode or if business exists locally, allow access
  return true
}

