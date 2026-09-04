import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { localDB } from '@/lib/local-db'
import { applyFollowUpTransition, type FollowUpStatus } from '@/server/calls/follow-up'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const { id } = await params

  try {
    const { data, error } = await auth.supabase
      .from('calls')
      .select(`*, business:businesses(name, type, language, phone), workflow:workflows(name, fields, conditions)`)
      .eq('id', id)
      .single()

    if (!error && data) return NextResponse.json(data)
  } catch {
    // fallback
  }

  const call = localDB.calls.get(id)
  if (!call) return NextResponse.json({ error: 'Call not found' }, { status: 404 })
  return NextResponse.json(call)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const { id } = await params
  const body = await request.json()
  const { follow_up_status, status, ...rest } = body as { follow_up_status?: FollowUpStatus; status?: string; [k: string]: unknown }

  const updates: Record<string, unknown> = { ...rest }
  if (follow_up_status) {
    const transition = applyFollowUpTransition('pending', follow_up_status)
    Object.assign(updates, transition, { follow_up_status })
  }
  if (status) {
    updates.status = status
  }

  try {
    const { data, error } = await auth.supabase.from('calls').update(updates).eq('id', id).select().single()
    if (!error && data) return NextResponse.json(data)
  } catch {
    // fallback
  }

  const updated = localDB.calls.update(id, updates)
  if (!updated) return NextResponse.json({ error: 'Call not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { id } = await params

  try {
    await auth.supabase.from('calls').delete().eq('id', id)
  } catch {
    // fallback
  }

  localDB.calls.delete(id)
  return NextResponse.json({ success: true })
}
