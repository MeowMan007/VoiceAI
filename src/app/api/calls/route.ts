import { NextRequest, NextResponse } from 'next/server'
import { requireUser, assertOwnsBusiness } from '@/lib/auth'
import { localDB } from '@/lib/local-db'
import { applyFollowUpTransition, type FollowUpStatus } from '@/server/calls/follow-up'

export async function GET(request: NextRequest) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const businessId = searchParams.get('business_id')
  const status = searchParams.get('status')
  const urgency = searchParams.get('urgency')

  try {
    let query = auth.supabase
      .from('calls')
      .select(`*, business:businesses(name, type, language), workflow:workflows(name)`)
      .order('created_at', { ascending: false })

    if (businessId) query = query.eq('business_id', businessId)
    if (status) query = query.eq('follow_up_status', status)
    if (urgency) query = query.eq('urgency', urgency)

    const { data, error } = await query
    if (!error && data && data.length > 0) return NextResponse.json(data)
  } catch {
    // fallback
  }

  let calls = localDB.calls.list()
  if (businessId) calls = calls.filter(c => c.business_id === businessId || c.businessId === businessId)
  if (status) calls = calls.filter(c => c.follow_up_status === status || (c as any).status === status)
  if (urgency) calls = calls.filter(c => c.urgency === urgency)

  return NextResponse.json(calls)
}

export async function POST(request: NextRequest) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const body = await request.json()
  const businessId = body.business_id || body.businessId

  const owns = await assertOwnsBusiness(auth.supabase, auth.user.id, businessId)
  if (!owns) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { data, error } = await auth.supabase.from('calls').insert(body).select().single()
    if (!error && data) return NextResponse.json(data, { status: 201 })
  } catch {
    // fallback
  }

  const created = localDB.calls.create(body)
  return NextResponse.json(created, { status: 201 })
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
    const transition = applyFollowUpTransition('pending', follow_up_status)
    Object.assign(updates, transition)
  }

  try {
    const { data, error } = await auth.supabase
      .from('calls')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (!error && data) return NextResponse.json(data)
  } catch {
    // fallback
  }

  const updated = localDB.calls.update(id, { ...updates, follow_up_status })
  if (!updated) return NextResponse.json({ error: 'Call not found' }, { status: 404 })
  return NextResponse.json(updated)
}
