'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/axios'
import { useAuth } from '@/context'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { Calendar, Star, Clock, Users } from 'lucide-react'

export default function DoctorDashboard() {
  const { user } = useAuth()
  const [doctor, setDoctor] = useState<any>(null)
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/api/doctors/me/profile'),
      api.get('/api/appointments/my'),
    ])
      .then(([docRes, aptRes]) => {
        setDoctor(docRes.data.doctor)
        setAppointments(aptRes.data.appointments)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const pending = appointments.filter((a) => a.status === 'pending').length
  const upcoming = appointments.filter((a) => a.status === 'confirmed').length
  const completed = appointments.filter((a) => a.status === 'completed').length

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>
        <p className="text-muted-foreground">
          {doctor?.isApproved
            ? 'Manage your appointments and availability'
            : 'Your profile is pending admin approval. Please complete your profile while you wait.'}
        </p>
      </div>

      {!doctor?.isApproved && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <p className="text-yellow-800 font-medium">Profile Pending Approval</p>
            <p className="text-sm text-yellow-700 mt-1">
              Please complete your profile with specialization, qualification, and consultation fee.
              An admin will review and approve your profile.
            </p>
            <Link href="/dashboard/doctor/profile" className="inline-block mt-3">
              <Button size="sm">Complete Profile</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center">
                <Clock className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <Calendar className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcoming}</p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                <Users className="size-5" />
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
                <Star className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Number(doctor?.avgRating || 0).toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Appointments */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent Appointments</CardTitle>
          <Link href="/dashboard/doctor/appointments">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <p className="text-muted-foreground">No appointments yet.</p>
          ) : (
            <div className="space-y-3">
              {appointments.slice(0, 5).map((apt: any) => (
                <div key={apt.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium">{apt.patientName}</p>
                    <p className="text-sm text-muted-foreground">
                      {apt.appointmentDate} at {apt.startTime?.slice(0, 5)}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    apt.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
