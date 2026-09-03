import { NextRequest, NextResponse } from 'next/server'
import { requireUser, assertOwnsBusiness } from '@/lib/auth'

export async function GET() {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const { data, error } = await auth.supabase
    .from('workflows')
    .select('*, business:businesses(id, name, type, language, phone)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const body = await request.json()
  const owns = await assertOwnsBusiness(auth.supabase, auth.user.id, body.business_id)
  if (!owns) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await auth.supabase
    .from('workflows')
    .insert({
      business_id: body.business_id,
      name: body.name,
      trigger: body.trigger || 'missed_call',
      greeting: body.greeting,
      closing_message: body.closing_message,
      language: body.language || 'en',
      fields: body.fields || [],
      conditions: body.conditions || [],
      post_action: body.post_action || 'create_record',
      calendar_enabled: !!body.calendar_enabled,
      is_active: body.is_active !== false,
    })
    .select('*, business:businesses(id, name, type, language, phone)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
