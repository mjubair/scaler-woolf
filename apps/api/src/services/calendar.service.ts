import { google } from 'googleapis'

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
    state: 'app',
  })
}

export async function handleOAuthCallback(code: string) {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

function getAppOAuth2Client() {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  if (!refreshToken) return null

  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  return oauth2Client
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
  const oauth2Client = getAppOAuth2Client()
  if (!oauth2Client) {
    console.log('[Calendar] No GOOGLE_REFRESH_TOKEN configured, skipping event creation')
    return { error: 'Google Calendar not configured' }
  }

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

export async function deleteCalendarEvent(eventId: string) {
  const oauth2Client = getAppOAuth2Client()
  if (!oauth2Client) return

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
