'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from '@/components/ui'
import { FileText, Plus, Trash2 } from 'lucide-react'

interface Medication {
  name: string
  dosage: string
  frequency: string
  duration: string
}

export default function DoctorPrescriptions() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [notes, setNotes] = useState('')
  const [medications, setMedications] = useState<Medication[]>([
    { name: '', dosage: '', frequency: '', duration: '' },
  ])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    api
      .get('/api/appointments/my', { params: { status: 'completed' } })
      .then((res) => setAppointments(res.data.appointments))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function addMedication() {
    setMedications([...medications, { name: '', dosage: '', frequency: '', duration: '' }])
  }

  function removeMedication(index: number) {
    setMedications(medications.filter((_, i) => i !== index))
  }

  function updateMedication(index: number, field: keyof Medication, value: string) {
    const updated = [...medications]
    updated[index] = { ...updated[index], [field]: value }
    setMedications(updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedAppointment) return
    setSaving(true)
    setMessage('')
    try {
      await api.post('/api/prescriptions', {
        appointmentId: Number(selectedAppointment),
        diagnosis,
        medications: medications.filter((m) => m.name),
        notes: notes || undefined,
      })
      setMessage('Prescription created successfully')
      setShowForm(false)
      setDiagnosis('')
      setNotes('')
      setMedications([{ name: '', dosage: '', frequency: '', duration: '' }])
      setSelectedAppointment('')
    } catch {
      setMessage('Failed to create prescription')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prescriptions</h1>
          <p className="text-muted-foreground">Create prescriptions for completed appointments</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="size-4 mr-2" />
          New Prescription
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Prescription</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>Select Appointment</Label>
                <select
                  value={selectedAppointment}
                  onChange={(e) => setSelectedAppointment(e.target.value)}
                  className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
                  required
                >
                  <option value="">Select a completed appointment...</option>
                  {appointments.map((apt) => (
                    <option key={apt.id} value={apt.id}>
                      {apt.patientName} — {apt.appointmentDate}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-1.5">
                <Label>Diagnosis *</Label>
                <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g., Upper respiratory tract infection" className="h-9" required />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Medications</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addMedication}>
                    <Plus className="size-3 mr-1" />
                    Add
                  </Button>
                </div>
                {medications.map((med, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 items-end">
                    <Input placeholder="Medicine name" value={med.name} onChange={(e) => updateMedication(i, 'name', e.target.value)} className="h-9" />
                    <Input placeholder="Dosage" value={med.dosage} onChange={(e) => updateMedication(i, 'dosage', e.target.value)} className="h-9" />
                    <Input placeholder="Frequency" value={med.frequency} onChange={(e) => updateMedication(i, 'frequency', e.target.value)} className="h-9" />
                    <div className="flex gap-1">
                      <Input placeholder="Duration" value={med.duration} onChange={(e) => updateMedication(i, 'duration', e.target.value)} className="h-9" />
                      {medications.length > 1 && (
                        <Button type="button" size="icon-sm" variant="ghost" onClick={() => removeMedication(i)}>
                          <Trash2 className="size-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-1.5">
                <Label>Notes</Label>
                <textarea className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-ring" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional instructions..." />
              </div>

              {message && (
                <p className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-destructive'}`}>
                  {message}
                </p>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Prescription'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              Select &quot;New Prescription&quot; to create a prescription for a completed appointment.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
