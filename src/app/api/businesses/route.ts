import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { localDB } from '@/lib/local-db'

export async function GET() {
  const auth = await requireUser()
  if (auth.error) return auth.error

  try {
    const { data, error } = await auth.supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data && data.length > 0) {
      return NextResponse.json(data)
    }
  } catch {
    // fallback
  }

  const localBiz = localDB.businesses.list()
  return NextResponse.json(localBiz)
}

export async function POST(request: NextRequest) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const body = await request.json()

  try {
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

    if (!error && data) {
      return NextResponse.json(data, { status: 201 })
    }
  } catch {
    // fallback
  }

  const created = localDB.businesses.create({
    owner_id: auth.user.id,
    name: body.name,
    type: body.type,
    phone: body.phone || '',
    description: body.description || '',
    language: body.language || 'en',
  })

  return NextResponse.json(created, { status: 201 })
}
