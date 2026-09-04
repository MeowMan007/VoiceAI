import { NextRequest, NextResponse } from 'next/server'
import { requireUser, assertOwnsBusiness } from '@/lib/auth'
import { localDB } from '@/lib/local-db'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { id } = await params

  try {
    const { data, error } = await auth.supabase
      .from('workflows')
      .select('*, business:businesses(id, name, type, language, phone)')
      .eq('id', id)
      .single()

    if (!error && data) return NextResponse.json(data)
  } catch {
    // fallback
  }

  const localWf = localDB.workflows.get(id)
  if (!localWf) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  return NextResponse.json(localWf)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { id } = await params
  const body = await request.json()

  if (body.business_id) {
    const owns = await assertOwnsBusiness(auth.supabase, auth.user.id, body.business_id)
    if (!owns) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { data, error } = await auth.supabase
      .from('workflows')
      .update({
        ...(body.business_id !== undefined ? { business_id: body.business_id } : {}),
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.trigger !== undefined ? { trigger: body.trigger } : {}),
        ...(body.greeting !== undefined ? { greeting: body.greeting } : {}),
        ...(body.closing_message !== undefined ? { closing_message: body.closing_message } : {}),
        ...(body.language !== undefined ? { language: body.language } : {}),
        ...(body.fields !== undefined ? { fields: body.fields } : {}),
        ...(body.conditions !== undefined ? { conditions: body.conditions } : {}),
        ...(body.post_action !== undefined ? { post_action: body.post_action } : {}),
        ...(body.calendar_enabled !== undefined ? { calendar_enabled: body.calendar_enabled } : {}),
        ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
      })
      .eq('id', id)
      .select('*, business:businesses(id, name, type, language, phone)')
      .single()

    if (!error && data) return NextResponse.json(data)
  } catch {
    // fallback
  }

  const updated = localDB.workflows.update(id, body)
  if (!updated) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { id } = await params

  try {
    await auth.supabase.from('workflows').delete().eq('id', id)
  } catch {
    // fallback
  }

  localDB.workflows.delete(id)
  return NextResponse.json({ success: true })
}
