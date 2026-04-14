'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { Calendar, Check, ExternalLink } from 'lucide-react'

export default function CalendarPage() {
  const searchParams = useSearchParams()
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  const justConnected = searchParams.get('connected') === 'true'
  const hasError = searchParams.get('error') === 'true'

  useEffect(() => {
    api
      .get('/api/calendar/status')
      .then((res) => setConnected(res.data.connected))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function connectCalendar() {
    try {
      const { data } = await api.get('/api/calendar/auth-url')
      window.location.href = data.url
    } catch {
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">Google Calendar</h1>
        <p className="text-muted-foreground">Connect your Google Calendar for automatic Meet link generation</p>
      </div>

      {justConnected && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <p className="text-green-700 font-medium flex items-center gap-2">
              <Check className="size-5" />
              Google Calendar connected successfully!
            </p>
          </CardContent>
        </Card>
      )}

      {hasError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-red-700 font-medium">
              Failed to connect Google Calendar. Please try again.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-5" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className={`size-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="font-medium">{connected ? 'Connected' : 'Not Connected'}</span>
          </div>

          {connected ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Your Google Calendar is connected. When patients book an appointment,
                a Google Meet link will be automatically generated and both you and the
                patient will receive calendar invites.
              </p>
              <Button variant="outline" onClick={connectCalendar}>
                <ExternalLink className="size-4 mr-2" />
                Reconnect
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Connect your Google Calendar to automatically create Google Meet links
                for your consultations. Patients will receive calendar invites with the
                Meet link.
              </p>
              <Button onClick={connectCalendar}>
                <Calendar className="size-4 mr-2" />
                Connect Google Calendar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
