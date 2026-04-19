'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { Check, X, Stethoscope } from 'lucide-react'

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState<any[]>([])
  const [filter, setFilter] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDoctors()
  }, [filter])

  async function fetchDoctors() {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filter) params.approved = filter
      const { data } = await api.get('/api/admin/doctors', { params })
      setDoctors(data.doctors)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  async function approveDoctor(id: number) {
    try {
      await api.patch(`/api/admin/doctors/${id}/approve`)
      fetchDoctors()
    } catch {
    }
  }

  async function rejectDoctor(id: number) {
    const reason = prompt('Rejection reason (optional):')
    try {
      await api.patch(`/api/admin/doctors/${id}/reject`, { reason })
      fetchDoctors()
    } catch {
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Doctor Management</h1>
        <p className="text-muted-foreground">Approve and manage doctor profiles</p>
      </div>

      <div className="flex gap-2">
        {['', 'false', 'true'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {f === '' ? 'All' : f === 'false' ? 'Pending' : 'Approved'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : doctors.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Stethoscope className="size-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No doctors found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {doctors.map((doc: any) => (
            <Card key={doc.id}>
              <CardContent className="pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{doc.userName}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        doc.isApproved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {doc.isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{doc.userEmail}</p>
                    <p className="text-sm text-muted-foreground">
                      {doc.specialization || 'No specialization set'} &middot;{' '}
                      {doc.qualification || 'No qualification set'} &middot;{' '}
                      {doc.experience} yrs &middot; Rs. {doc.consultationFee}
                    </p>
                    {doc.userPhone && <p className="text-sm text-muted-foreground">Phone: {doc.userPhone}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {!doc.isApproved && (
                      <Button size="sm" onClick={() => approveDoctor(doc.id)}>
                        <Check className="size-3 mr-1" />
                        Approve
                      </Button>
                    )}
                    {doc.isApproved && (
                      <Button size="sm" variant="destructive" onClick={() => rejectDoctor(doc.id)}>
                        <X className="size-3 mr-1" />
                        Revoke
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
