'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { FileText, Pill } from 'lucide-react'

interface Medication {
  name: string
  dosage: string
  frequency: string
  duration: string
}

interface Prescription {
  id: number
  diagnosis: string
  medications: Medication[]
  notes: string | null
  createdAt: string
  doctorName: string
  doctorSpecialization: string
}

export default function PatientPrescriptions() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/api/prescriptions/my')
      .then((res) => setPrescriptions(res.data.prescriptions))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Prescriptions</h1>
        <p className="text-muted-foreground">View prescriptions from your consultations</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : prescriptions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="size-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No prescriptions yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((rx) => (
            <Card key={rx.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{rx.diagnosis}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      By {rx.doctorName} ({rx.doctorSpecialization})
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(rx.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-1">
                    <Pill className="size-4" />
                    Medications
                  </p>
                  <div className="grid gap-2">
                    {rx.medications.map((med, i) => (
                      <div key={i} className="bg-muted/50 rounded-lg p-3 text-sm">
                        <p className="font-medium">{med.name}</p>
                        <p className="text-muted-foreground">
                          {med.dosage} &middot; {med.frequency} &middot; {med.duration}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                {rx.notes && (
                  <div>
                    <p className="text-sm font-medium mb-1">Notes</p>
                    <p className="text-sm text-muted-foreground">{rx.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
