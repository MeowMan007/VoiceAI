import { NextRequest, NextResponse } from 'next/server'
import { requireUser, assertOwnsBusiness } from '@/lib/auth'
import {
  checkCalendarAvailability,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@/lib/google-calendar'

export async function POST(request: NextRequest) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const body = await request.json()
  const { action, business_id, ...params } = body as {
    action: string
    business_id: string
    date?: string
    time?: string
    duration_minutes?: number
    event_id?: string
    title?: string
    durationMinutes?: number
    description?: string
    attendeeName?: string
    newDate?: string
    newTime?: string
    newTitle?: string
  }

  if (!business_id) return NextResponse.json({ error: 'business_id required' }, { status: 400 })
  const owns = await assertOwnsBusiness(auth.supabase, auth.user.id, business_id)
  if (!owns) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    let result
    switch (action) {
      case 'check':
        result = await checkCalendarAvailability(business_id, params.date || '', params.time || '', params.duration_minutes)
        break
      case 'create':
        result = await createCalendarEvent(business_id, {
          title: params.title || 'Callback',
          date: params.date || '',
          time: params.time || '',
          durationMinutes: params.durationMinutes || params.duration_minutes,
          description: params.description,
          attendeeName: params.attendeeName,
        })
        break
      case 'update':
        result = await updateCalendarEvent(business_id, params.event_id || '', {
          newDate: params.newDate,
          newTime: params.newTime,
          newTitle: params.newTitle,
        })
        break
      case 'delete':
        result = await deleteCalendarEvent(business_id, params.event_id || '')
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error('Calendar API error:', error)
    return NextResponse.json({ error: 'Calendar operation failed' }, { status: 500 })
  }
}
