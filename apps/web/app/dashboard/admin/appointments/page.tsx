'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/axios'
import { Card, CardContent } from '@/components/ui'
import { Calendar } from 'lucide-react'

export default function AdminAppointments() {
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
      const { data } = await api.get('/api/admin/appointments', { params })
      setAppointments(data.appointments)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const filters = ['', 'pending', 'confirmed', 'completed', 'cancelled']

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">All Appointments</h1>
        <p className="text-muted-foreground">View all platform appointments</p>
      </div>

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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-sm">
                      <span className="font-medium">{apt.patientName}</span>
                      {' with '}
                      <span className="font-medium">{apt.doctorName}</span>
                      <span className="text-muted-foreground"> ({apt.doctorSpecialization})</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {apt.appointmentDate} at {apt.startTime?.slice(0, 5)} - {apt.endTime?.slice(0, 5)}
                    </p>
                    {apt.reason && <p className="text-sm mt-1">Reason: {apt.reason}</p>}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium self-start ${
                    apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    apt.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {apt.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
