import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { applyFollowUpTransition, type FollowUpStatus } from '@/server/calls/follow-up'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const { id } = await params
  const { data, error } = await auth.supabase
    .from('calls')
    .select(`*, business:businesses(name, type, language, phone), workflow:workflows(name, fields, conditions)`)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const { id } = await params
  const body = await request.json()
  const { follow_up_status, ...rest } = body as { follow_up_status?: FollowUpStatus; [k: string]: unknown }

  const updates: Record<string, unknown> = { ...rest }
  if (follow_up_status) {
    const { data: current } = await auth.supabase
      .from('calls')
      .select('follow_up_status')
      .eq('id', id)
      .single()
    Object.assign(
      updates,
      applyFollowUpTransition((current?.follow_up_status as FollowUpStatus) || 'pending', follow_up_status)
    )
  }

  const { data, error } = await auth.supabase.from('calls').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
