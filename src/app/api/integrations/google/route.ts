import { NextRequest, NextResponse } from 'next/server'
import { requireUser, assertOwnsBusiness } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const businessId = request.nextUrl.searchParams.get('business_id')
  if (!businessId) return NextResponse.json({ connected: false })

  const owns = await assertOwnsBusiness(auth.supabase, auth.user.id, businessId)
  if (!owns) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await auth.supabase
    .from('integrations')
    .select('id, provider, updated_at')
    .eq('business_id', businessId)
    .eq('provider', 'google_calendar')
    .maybeSingle()

  return NextResponse.json({ connected: !!data, updated_at: data?.updated_at || null })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const businessId = request.nextUrl.searchParams.get('business_id')
  if (!businessId) return NextResponse.json({ error: 'business_id required' }, { status: 400 })

  const owns = await assertOwnsBusiness(auth.supabase, auth.user.id, businessId)
  if (!owns) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await auth.supabase
    .from('integrations')
    .delete()
    .eq('business_id', businessId)
    .eq('provider', 'google_calendar')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
