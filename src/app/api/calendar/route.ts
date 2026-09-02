import { NextRequest, NextResponse } from 'next/server'
import {
  checkCalendarAvailability,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent
} from '@/lib/google-calendar'

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get('google_access_token')?.value || 'mock'
  const body = await request.json()
  const { action, ...params } = body

  try {
    let result
    switch (action) {
      case 'check':
        result = await checkCalendarAvailability(accessToken, params.date, params.time, params.duration_minutes)
        break
      case 'create':
        result = await createCalendarEvent(accessToken, params)
        break
      case 'update':
        result = await updateCalendarEvent(accessToken, params.event_id, params)
        break
      case 'delete':
        result = await deleteCalendarEvent(accessToken, params.event_id)
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
