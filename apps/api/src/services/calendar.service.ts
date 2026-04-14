import { google } from 'googleapis'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { doctors } from '../db/schema'

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  )
}

export function getAuthUrl() {
  const oauth2Client = getOAuth2Client()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],
  })
}

export async function handleOAuthCallback(code: string) {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

export async function saveDoctorRefreshToken(doctorId: number, refreshToken: string) {
  await db
    .update(doctors)
    .set({ googleRefreshToken: refreshToken, updatedAt: new Date() })
    .where(eq(doctors.id, doctorId))
}

export async function createCalendarEvent(params: {
  doctorId: number
  summary: string
  description: string
  startDateTime: string // ISO 8601
  endDateTime: string // ISO 8601
  patientEmail: string
  doctorEmail: string
  timeZone?: string
}) {
  // Get doctor's refresh token
  const [doctor] = await db
    .select({ googleRefreshToken: doctors.googleRefreshToken })
    .from(doctors)
    .where(eq(doctors.id, params.doctorId))

  if (!doctor?.googleRefreshToken) {
    return { error: 'Doctor has not connected Google Calendar' }
  }

  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ refresh_token: doctor.googleRefreshToken })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  const event = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    requestBody: {
      summary: params.summary,
      description: params.description,
      start: {
        dateTime: params.startDateTime,
        timeZone: params.timeZone || 'Asia/Kolkata',
      },
      end: {
        dateTime: params.endDateTime,
        timeZone: params.timeZone || 'Asia/Kolkata',
      },
      attendees: [{ email: params.patientEmail }, { email: params.doctorEmail }],
      conferenceData: {
        createRequest: {
          requestId: `consultation-${params.doctorId}-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 15 },
        ],
      },
    },
  })

  const meetLink = event.data.hangoutLink || event.data.conferenceData?.entryPoints?.[0]?.uri || null
  const eventId = event.data.id || null

  return { meetLink, eventId }
}

export async function deleteCalendarEvent(doctorId: number, eventId: string) {
  const [doctor] = await db
    .select({ googleRefreshToken: doctors.googleRefreshToken })
    .from(doctors)
    .where(eq(doctors.id, doctorId))

  if (!doctor?.googleRefreshToken) return

  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ refresh_token: doctor.googleRefreshToken })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    })
  } catch {
    // Event may have already been deleted
  }
}
