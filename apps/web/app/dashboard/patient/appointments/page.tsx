'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { Calendar, Video, X } from 'lucide-react'

export default function PatientAppointments() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [filter, setFilter] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAppointments()
  }, [filter])

  async function fetchAppointments() {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filter) params.status = filter
      const { data } = await api.get('/api/appointments/my', { params })
      setAppointments(data.appointments)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  async function cancelAppointment(id: number) {
    if (!confirm('Are you sure you want to cancel this appointment?')) return
    try {
      await api.patch(`/api/appointments/${id}/cancel`, { reason: 'Cancelled by patient' })
      fetchAppointments()
    } catch {
    }
  }

  const filters = ['', 'pending', 'confirmed', 'completed', 'cancelled']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Appointments</h1>
          <p className="text-muted-foreground">View and manage your consultations</p>
        </div>
        <Link href="/doctors">
          <Button>Book New</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {f || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : appointments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Calendar className="size-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No appointments found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt: any) => (
            <Card key={apt.id}>
              <CardContent className="pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {apt.doctorName?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{apt.doctorName}</p>
                      <p className="text-sm text-muted-foreground">{apt.doctorSpecialization}</p>
                      <p className="text-sm text-muted-foreground">
                        {apt.appointmentDate} at {apt.startTime?.slice(0, 5)} - {apt.endTime?.slice(0, 5)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      apt.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {apt.status}
                    </span>
                    {apt.googleMeetLink && apt.status === 'confirmed' && (
                      <a href={apt.googleMeetLink} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline">
                          <Video className="size-3 mr-1" />
                          Join
                        </Button>
                      </a>
                    )}
                    {(apt.status === 'pending' || apt.status === 'confirmed') && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => cancelAppointment(apt.id)}
                      >
                        <X className="size-3 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
