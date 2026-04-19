'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { Users, Stethoscope, Calendar, CreditCard, Clock } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [recentAppointments, setRecentAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/api/admin/dashboard')
      .then((res) => {
        setStats(res.data.stats)
        setRecentAppointments(res.data.recentAppointments)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <Stethoscope className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.approvedDoctors || 0}</p>
                <p className="text-sm text-muted-foreground">Active Doctors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center">
                <Clock className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.pendingDoctors || 0}</p>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
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
                <p className="text-2xl font-bold">{stats?.totalPatients || 0}</p>
                <p className="text-sm text-muted-foreground">Patients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                <CreditCard className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">Rs. {stats?.totalRevenue || '0'}</p>
                <p className="text-sm text-muted-foreground">Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Calendar className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalAppointments || 0}</p>
                <p className="text-sm text-muted-foreground">Total Appointments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
                <Calendar className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.completedAppointments || 0}</p>
                <p className="text-sm text-muted-foreground">Completed Appointments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/dashboard/admin/doctors">
            <Button>Manage Doctors</Button>
          </Link>
          <Link href="/dashboard/admin/patients">
            <Button variant="outline">View Patients</Button>
          </Link>
          <Link href="/dashboard/admin/appointments">
            <Button variant="outline">All Appointments</Button>
          </Link>
        </CardContent>
      </Card>

      {/* Recent Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {recentAppointments.length === 0 ? (
            <p className="text-muted-foreground">No appointments yet.</p>
          ) : (
            <div className="space-y-3">
              {recentAppointments.map((apt: any) => (
                <div key={apt.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="text-sm">
                      <span className="font-medium">{apt.patientName}</span>
                      {' with '}
                      <span className="font-medium">{apt.doctorName}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{apt.appointmentDate}</p>
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
