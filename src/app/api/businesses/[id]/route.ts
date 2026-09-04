import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { localDB } from '@/lib/local-db'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { id } = await params

  try {
    const { data, error } = await auth.supabase.from('businesses').select('*').eq('id', id).single()
    if (!error && data) return NextResponse.json(data)
  } catch {
    // fallback
  }

  const localB = localDB.businesses.get(id)
  if (!localB) return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  return NextResponse.json(localB)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { id } = await params
  const body = await request.json()

  try {
    const { data, error } = await auth.supabase
      .from('businesses')
      .update({
        name: body.name,
        type: body.type,
        phone: body.phone,
        description: body.description,
        language: body.language,
      })
      .eq('id', id)
      .select()
      .single()

    if (!error && data) return NextResponse.json(data)
  } catch {
    // fallback
  }

  const updated = localDB.businesses.update(id, body)
  if (!updated) return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const { id } = await params

  try {
    await auth.supabase.from('businesses').delete().eq('id', id)
  } catch {
    // fallback
  }

  localDB.businesses.delete(id)
  return NextResponse.json({ success: true })
}
