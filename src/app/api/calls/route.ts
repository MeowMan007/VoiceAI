import { NextRequest, NextResponse } from 'next/server'
import { requireUser, assertOwnsBusiness } from '@/lib/auth'
import { applyFollowUpTransition, type FollowUpStatus } from '@/server/calls/follow-up'

export async function GET(request: NextRequest) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const businessId = searchParams.get('business_id')
  const status = searchParams.get('status')
  const urgency = searchParams.get('urgency')
  const limit = parseInt(searchParams.get('limit') || '50')

  let query = auth.supabase
    .from('calls')
    .select(`*, business:businesses(name, type, language), workflow:workflows(name)`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (businessId) query = query.eq('business_id', businessId)
  if (status) query = query.eq('follow_up_status', status)
  if (urgency) query = query.eq('urgency', urgency)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const body = await request.json()
  const owns = await assertOwnsBusiness(auth.supabase, auth.user.id, body.business_id)
  if (!owns) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await auth.supabase.from('calls').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const body = await request.json()
  const { id, follow_up_status, ...updates } = body as {
    id: string
    follow_up_status?: FollowUpStatus
    [k: string]: unknown
  }

  if (follow_up_status) {
    const { data: current } = await auth.supabase
      .from('calls')
      .select('follow_up_status')
      .eq('id', id)
      .single()
    const transition = applyFollowUpTransition(
      (current?.follow_up_status as FollowUpStatus) || 'pending',
      follow_up_status
    )
    Object.assign(updates, transition)
  }

  const { data, error } = await auth.supabase
    .from('calls')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
