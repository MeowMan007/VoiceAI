import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { createAdminClient } from '@/lib/supabase/server'
import { decryptSecret, encryptSecret, encryptionConfigured } from '@/server/integrations/encryption'

export function getOAuth2Client(accessToken?: string, refreshToken?: string) {
  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  if (accessToken || refreshToken) {
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
  }

  return oauth2Client
}

export function getAuthUrl(state: string) {
  const oauth2Client = getOAuth2Client()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    prompt: 'consent',
    state,
  })
}

export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

type StoredTokens = {
  accessToken: string
  refreshToken?: string
  rowId: string
}

async function loadBusinessTokens(businessId: string): Promise<StoredTokens | null> {
  if (!encryptionConfigured()) return null
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('integrations')
    .select('id, access_token_encrypted, refresh_token_encrypted, token_expires_at')
    .eq('business_id', businessId)
    .eq('provider', 'google_calendar')
    .maybeSingle()

  if (!data?.access_token_encrypted) return null

  return {
    rowId: data.id,
    accessToken: decryptSecret(data.access_token_encrypted),
    refreshToken: data.refresh_token_encrypted ? decryptSecret(data.refresh_token_encrypted) : undefined,
  }
}

async function persistRefreshedTokens(rowId: string, accessToken: string, expiryDate?: number | null) {
  const supabase = createAdminClient()
  await supabase
    .from('integrations')
    .update({
      access_token_encrypted: encryptSecret(accessToken),
      token_expires_at: expiryDate ? new Date(expiryDate).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', rowId)
}

async function withCalendarClient(businessId: string) {
  const stored = await loadBusinessTokens(businessId)
  if (!stored) return null

  const oauth2Client = getOAuth2Client(stored.accessToken, stored.refreshToken)
  oauth2Client.on('tokens', tokens => {
    if (tokens.access_token) {
      persistRefreshedTokens(stored.rowId, tokens.access_token, tokens.expiry_date).catch(() => null)
    }
  })
  return google.calendar({ version: 'v3', auth: oauth2Client })
}

export async function checkCalendarAvailability(
  businessId: string,
  date: string,
  time: string,
  durationMinutes: number = 60
) {
  try {
    const calendar = await withCalendarClient(businessId)
    if (!calendar) {
      return {
        available: true,
        date,
        time,
        simulated: true,
        message: `No Google Calendar connected. Simulated: slot on ${date} at ${time} is available.`,
      }
    }

    const startTime = new Date(`${date}T${time}:00`)
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000)

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        items: [{ id: 'primary' }],
      },
    })

    const busySlots = response.data.calendars?.primary?.busy || []
    const isAvailable = busySlots.length === 0

    return {
      available: isAvailable,
      date,
      time,
      simulated: false,
      message: isAvailable
        ? `The slot on ${date} at ${time} is available.`
        : `That slot is busy. Please choose another time.`,
    }
  } catch (err) {
    // A connected calendar that errors is a real failure — surface it, do not pretend the slot is free.
    return {
      available: false,
      date,
      time,
      simulated: false,
      error: true,
      message: `Could not check calendar availability: ${(err as Error).message}`,
    }
  }
}

export async function createCalendarEvent(
  businessId: string,
  params: {
    title: string
    date: string
    time: string
    durationMinutes?: number
    description?: string
    attendeeName?: string
  }
) {
  try {
    const availability = await checkCalendarAvailability(
      businessId,
      params.date,
      params.time,
      params.durationMinutes || 60
    )
    if (!availability.available) {
      return {
        success: false,
        simulated: availability.simulated,
        message: availability.message,
      }
    }

    const calendar = await withCalendarClient(businessId)
    if (!calendar) {
      const mockEventId = `sim_${Date.now()}`
      return {
        success: true,
        eventId: mockEventId,
        htmlLink: undefined,
        simulated: true,
        message: `Simulated event "${params.title}" for ${params.date} at ${params.time} (Google Calendar not connected).`,
      }
    }

    const startTime = new Date(`${params.date}T${params.time}:00`)
    const endTime = new Date(startTime.getTime() + (params.durationMinutes || 60) * 60000)

    const event = {
      summary: params.title,
      description:
        params.description ||
        `Scheduled via Voice AI Assistant${params.attendeeName ? ` for ${params.attendeeName}` : ''}`,
      start: { dateTime: startTime.toISOString(), timeZone: 'Asia/Kolkata' },
      end: { dateTime: endTime.toISOString(), timeZone: 'Asia/Kolkata' },
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    })

    return {
      success: true,
      eventId: response.data.id,
      htmlLink: response.data.htmlLink,
      simulated: false,
      message: `Event "${params.title}" created on ${params.date} at ${params.time}.`,
    }
  } catch (err) {
    // A connected calendar that fails to insert is a real error — no fake event id, no false success.
    return {
      success: false,
      simulated: false,
      error: true,
      message: `Failed to create calendar event: ${(err as Error).message}`,
    }
  }
}

export async function updateCalendarEvent(
  businessId: string,
  eventId: string,
  updates: { newDate?: string; newTime?: string; newTitle?: string }
) {
  try {
    const calendar = await withCalendarClient(businessId)
    if (!calendar) {
      return { success: true, simulated: true, message: 'Simulated event update (Google Calendar not connected).' }
    }

    const eventResponse = await calendar.events.get({ calendarId: 'primary', eventId })
    const existingEvent = eventResponse.data

    if (updates.newDate && updates.newTime) {
      const startTime = new Date(`${updates.newDate}T${updates.newTime}:00`)
      const duration =
        existingEvent.end?.dateTime && existingEvent.start?.dateTime
          ? new Date(existingEvent.end.dateTime).getTime() - new Date(existingEvent.start.dateTime).getTime()
          : 3600000
      const endTime = new Date(startTime.getTime() + duration)
      existingEvent.start = { dateTime: startTime.toISOString(), timeZone: 'Asia/Kolkata' }
      existingEvent.end = { dateTime: endTime.toISOString(), timeZone: 'Asia/Kolkata' }
    }

    if (updates.newTitle) existingEvent.summary = updates.newTitle

    await calendar.events.update({ calendarId: 'primary', eventId, requestBody: existingEvent })
    return { success: true, simulated: false, message: 'Event updated successfully.' }
  } catch (err) {
    return { success: false, simulated: false, error: true, message: `Failed to update calendar event: ${(err as Error).message}` }
  }
}

export async function deleteCalendarEvent(businessId: string, eventId: string) {
  try {
    const calendar = await withCalendarClient(businessId)
    if (!calendar) {
      return { success: true, simulated: true, message: 'Simulated cancellation (Google Calendar not connected).' }
    }
    await calendar.events.delete({ calendarId: 'primary', eventId })
    return { success: true, simulated: false, message: 'Event cancelled successfully.' }
  } catch (err) {
    return { success: false, simulated: false, error: true, message: `Failed to cancel calendar event: ${(err as Error).message}` }
  }
}
