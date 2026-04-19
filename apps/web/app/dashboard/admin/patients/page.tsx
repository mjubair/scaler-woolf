'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/axios'
import { Card, CardContent } from '@/components/ui'
import { Users } from 'lucide-react'

export default function AdminPatients() {
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/api/admin/patients')
      .then((res) => setPatients(res.data.patients))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Patients</h1>
        <p className="text-muted-foreground">View registered patients ({patients.length})</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : patients.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="size-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No patients registered yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {patients.map((patient: any) => (
            <Card key={patient.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{patient.name}</p>
                    <p className="text-sm text-muted-foreground">{patient.email}</p>
                    {patient.phone && <p className="text-sm text-muted-foreground">{patient.phone}</p>}
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      patient.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {patient.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Joined {new Date(patient.createdAt).toLocaleDateString()}
                    </p>
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
