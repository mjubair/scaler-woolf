'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/axios'
import { useAuth } from '@/context'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { Calendar, FileText, Heart, Search } from 'lucide-react'

export default function PatientDashboard() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/api/appointments/my')
      .then((res) => setAppointments(res.data.appointments))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const upcoming = appointments.filter((a) => a.status === 'confirmed' || a.status === 'pending')
  const completed = appointments.filter((a) => a.status === 'completed').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>
        <p className="text-muted-foreground">Manage your health and appointments</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <Calendar className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcoming.length}</p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                <FileText className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                <Heart className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{appointments.length}</p>
                <p className="text-sm text-muted-foreground">Total Visits</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/doctors">
            <Button>
              <Search className="size-4 mr-2" />
              Find a Doctor
            </Button>
          </Link>
          <Link href="/dashboard/patient/appointments">
            <Button variant="outline">View Appointments</Button>
          </Link>
          <Link href="/dashboard/patient/medical-history">
            <Button variant="outline">Medical History</Button>
          </Link>
        </CardContent>
      </Card>

      {/* Upcoming Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : upcoming.length === 0 ? (
            <p className="text-muted-foreground">No upcoming appointments.</p>
          ) : (
            <div className="space-y-3">
              {upcoming.slice(0, 5).map((apt: any) => (
                <div key={apt.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium">{apt.doctorName}</p>
                    <p className="text-sm text-muted-foreground">
                      {apt.appointmentDate} at {apt.startTime?.slice(0, 5)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      apt.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {apt.status}
                    </span>
                    {apt.googleMeetLink && (
                      <a href={apt.googleMeetLink} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline">Join Meet</Button>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
