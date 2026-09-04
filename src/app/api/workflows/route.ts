import { NextRequest, NextResponse } from 'next/server'
import { requireUser, assertOwnsBusiness } from '@/lib/auth'
import { localDB } from '@/lib/local-db'

export async function GET() {
  const auth = await requireUser()
  if (auth.error) return auth.error

  try {
    const { data, error } = await auth.supabase
      .from('workflows')
      .select('*, business:businesses(id, name, type, language, phone)')
      .order('created_at', { ascending: false })

    if (!error && data && data.length > 0) {
      return NextResponse.json(data)
    }
  } catch {
    // Supabase unavailable, fallback to local store
  }

  const localWorkflows = localDB.workflows.list()
  return NextResponse.json(localWorkflows)
}

export async function POST(request: NextRequest) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const body = await request.json()
  const businessId = body.business_id || body.businessId

  const owns = await assertOwnsBusiness(auth.supabase, auth.user.id, businessId)
  if (!owns) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { data, error } = await auth.supabase
      .from('workflows')
      .insert({
        business_id: businessId,
        name: body.name,
        trigger: body.trigger || 'missed_call',
        greeting: body.greeting,
        closing_message: body.closing_message,
        language: body.language || 'en',
        fields: body.fields || [],
        conditions: body.conditions || [],
        post_action: body.post_action || 'create_record',
        calendar_enabled: !!body.calendar_enabled,
        is_active: body.is_active !== false && body.isActive !== false,
      })
      .select('*, business:businesses(id, name, type, language, phone)')
      .single()

    if (!error && data) {
      return NextResponse.json(data, { status: 201 })
    }
  } catch {
    // Fallback to local store
  }

  const created = localDB.workflows.create({
    business_id: businessId,
    name: body.name,
    trigger: body.trigger || 'missed_call',
    greeting: body.greeting,
    closing_message: body.closing_message,
    language: body.language || 'en',
    fields: body.fields || [],
    conditions: body.conditions || [],
    post_action: body.post_action || 'create_record',
    calendar_enabled: !!body.calendar_enabled,
    is_active: body.is_active !== false && body.isActive !== false,
  })

  return NextResponse.json(created, { status: 201 })
}
