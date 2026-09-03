import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'

export async function GET() {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const { data, error } = await auth.supabase
    .from('businesses')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const body = await request.json()
  const { data, error } = await auth.supabase
    .from('businesses')
    .insert({
      owner_id: auth.user.id,
      name: body.name,
      type: body.type,
      phone: body.phone || null,
      description: body.description || null,
      language: body.language || 'en',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
