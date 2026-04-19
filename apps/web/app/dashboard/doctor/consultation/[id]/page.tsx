'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/axios'
import { useAuth } from '@/context'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/components/ui'
import {
  ArrowLeft,
  Video,
  Save,
  Check,
  Plus,
  Trash2,
  FileText,
  Heart,
  User,
  Pill,
  StickyNote,
  Paperclip,
  Image,
  Download,
} from 'lucide-react'

interface Appointment {
  id: number
  patientId: number
  doctorId: number
  appointmentDate: string
  startTime: string
  endTime: string
  status: string
  reason: string | null
  patientNote: string | null
  doctorNotes: string | null
  googleMeetLink: string | null
  patientName: string
  patientEmail: string
}

interface MedicalEntry {
  id: number
  condition: string
  description: string | null
  diagnosedDate: string | null
  isOngoing: boolean
}

interface PastPrescription {
  id: number
  diagnosis: string
  medications: Array<{ name: string; dosage: string; frequency: string; duration: string }>
  notes: string | null
  createdAt: string
  doctorName: string
}

interface Medication {
  name: string
  dosage: string
  frequency: string
  duration: string
}

interface Attachment {
  id: number
  fileName: string
  fileType: string
  fileSize: number
  cloudinaryUrl: string
  createdAt: string
}

export default function ConsultationPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const appointmentId = params.id as string

  // Data states
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [medicalHistory, setMedicalHistory] = useState<MedicalEntry[]>([])
  const [pastPrescriptions, setPastPrescriptions] = useState<PastPrescription[]>([])
  const [patientAttachments, setPatientAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)

  // Notes state
  const [notes, setNotes] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)

  // Prescription form state
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false)
  const [diagnosis, setDiagnosis] = useState('')
  const [medications, setMedications] = useState<Medication[]>([
    { name: '', dosage: '', frequency: '', duration: '' },
  ])
  const [prescriptionNotes, setPrescriptionNotes] = useState('')
  const [prescriptionSaving, setPrescriptionSaving] = useState(false)
  const [prescriptionMessage, setPrescriptionMessage] = useState('')

  // Completing state
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: aptData } = await api.get(`/api/appointments/${appointmentId}`)
        const apt = aptData.appointment
        setAppointment(apt)
        setNotes(apt.doctorNotes || '')

        // Fetch patient data in parallel
        const [historyRes, rxRes, attachRes] = await Promise.allSettled([
          api.get(`/api/patients/${apt.patientId}/medical-history`),
          api.get(`/api/prescriptions/patient/${apt.patientId}`),
          api.get(`/api/attachments/appointment/${appointmentId}`),
        ])

        if (historyRes.status === 'fulfilled') {
          setMedicalHistory(historyRes.value.data.medicalHistory)
        }
        if (rxRes.status === 'fulfilled') {
          setPastPrescriptions(rxRes.value.data.prescriptions)
        }
        if (attachRes.status === 'fulfilled') {
          setPatientAttachments(attachRes.value.data.attachments)
        }
      } catch {
        // appointment not found or access denied
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [appointmentId])

  async function saveNotes() {
    setNotesSaving(true)
    setNotesSaved(false)
    try {
      await api.patch(`/api/appointments/${appointmentId}/notes`, { notes })
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    } catch {
    } finally {
      setNotesSaving(false)
    }
  }

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

  async function savePrescription() {
    if (!diagnosis || medications.filter((m) => m.name).length === 0) return
    setPrescriptionSaving(true)
    setPrescriptionMessage('')
    try {
      await api.post('/api/prescriptions', {
        appointmentId: Number(appointmentId),
        diagnosis,
        medications: medications.filter((m) => m.name),
        notes: prescriptionNotes || undefined,
      })
      setPrescriptionMessage('Prescription saved and patient notified.')
      setShowPrescriptionForm(false)
      setDiagnosis('')
      setMedications([{ name: '', dosage: '', frequency: '', duration: '' }])
      setPrescriptionNotes('')

      // Refresh past prescriptions
      if (appointment) {
        const { data } = await api.get(`/api/prescriptions/patient/${appointment.patientId}`)
        setPastPrescriptions(data.prescriptions)
      }
    } catch (err: any) {
      setPrescriptionMessage(err.response?.data?.error || 'Failed to save prescription')
    } finally {
      setPrescriptionSaving(false)
    }
  }

  async function markCompleted() {
    if (!confirm('Mark this consultation as completed?')) return
    setCompleting(true)
    try {
      // Save notes first
      await api.patch(`/api/appointments/${appointmentId}/notes`, { notes })
      // Then mark completed
      await api.patch(`/api/appointments/${appointmentId}/status`, { status: 'completed' })
      router.push('/dashboard/doctor/appointments')
    } catch {
    } finally {
      setCompleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Appointment not found.</p>
        <Link href="/dashboard/doctor/appointments" className="text-primary underline text-sm mt-2 inline-block">
          Back to appointments
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard/doctor/appointments"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="size-4" />
            Back to appointments
          </Link>
          <h1 className="text-2xl font-bold">Consultation with {appointment.patientName}</h1>
          <p className="text-muted-foreground">
            {appointment.appointmentDate} at {appointment.startTime?.slice(0, 5)} -{' '}
            {appointment.endTime?.slice(0, 5)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${
              appointment.status === 'confirmed'
                ? 'bg-green-100 text-green-700'
                : appointment.status === 'completed'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {appointment.status}
          </span>
          {appointment.googleMeetLink && appointment.status === 'confirmed' && (
            <a href={appointment.googleMeetLink} target="_blank" rel="noopener noreferrer">
              <Button>
                <Video className="size-4 mr-2" />
                Join Meeting
              </Button>
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Patient Info */}
        <div className="space-y-4">
          {/* Patient Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="size-4" />
                Patient Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Name:</span>{' '}
                <span className="font-medium">{appointment.patientName}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Email:</span> {appointment.patientEmail}
              </p>
              {appointment.reason && (
                <div className="pt-2 border-t">
                  <p className="text-muted-foreground">Reason for visit:</p>
                  <p className="mt-1">{appointment.reason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Medical History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Heart className="size-4" />
                Medical History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {medicalHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No medical history on record.</p>
              ) : (
                <div className="space-y-2">
                  {medicalHistory.map((entry) => (
                    <div key={entry.id} className="text-sm border-b pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{entry.condition}</span>
                        {entry.isOngoing && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">
                            Ongoing
                          </span>
                        )}
                      </div>
                      {entry.description && (
                        <p className="text-muted-foreground mt-0.5">{entry.description}</p>
                      )}
                      {entry.diagnosedDate && (
                        <p className="text-xs text-muted-foreground">Diagnosed: {entry.diagnosedDate}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past Prescriptions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4" />
                Past Prescriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pastPrescriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No past prescriptions.</p>
              ) : (
                <div className="space-y-3">
                  {pastPrescriptions.map((rx) => (
                    <div key={rx.id} className="text-sm border-b pb-2 last:border-0 last:pb-0">
                      <p className="font-medium">{rx.diagnosis}</p>
                      <p className="text-xs text-muted-foreground">
                        By {rx.doctorName} &middot;{' '}
                        {new Date(rx.createdAt).toLocaleDateString()}
                      </p>
                      <div className="mt-1 space-y-0.5">
                        {rx.medications.map((med, i) => (
                          <p key={i} className="text-muted-foreground">
                            {med.name} — {med.dosage}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Patient Note */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <StickyNote className="size-4" />
                Patient Note
              </CardTitle>
            </CardHeader>
            <CardContent>
              {appointment?.patientNote ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {appointment.patientNote}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No note from patient.</p>
              )}
            </CardContent>
          </Card>

          {/* Patient Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Paperclip className="size-4" />
                Patient Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patientAttachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents uploaded by patient.</p>
              ) : (
                <div className="space-y-2">
                  {patientAttachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.cloudinaryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 hover:bg-muted transition-colors"
                    >
                      {att.fileType.startsWith('image/') ? (
                        <Image className="size-4 text-blue-500 shrink-0" />
                      ) : (
                        <FileText className="size-4 text-red-500 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{att.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {att.fileSize < 1024 * 1024
                            ? `${(att.fileSize / 1024).toFixed(1)} KB`
                            : `${(att.fileSize / (1024 * 1024)).toFixed(1)} MB`}
                          {' — '}
                          {new Date(att.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Download className="size-4 text-muted-foreground shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Center + Right Column — Actions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Doctor's Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <StickyNote className="size-4" />
                Consultation Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Type your consultation notes here... Symptoms observed, examination findings, diagnosis considerations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={saveNotes} disabled={notesSaving}>
                  <Save className="size-3 mr-1" />
                  {notesSaving ? 'Saving...' : 'Save Notes'}
                </Button>
                {notesSaved && (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <Check className="size-3" />
                    Saved
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Prescription */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Pill className="size-4" />
                Prescription
              </CardTitle>
              {!showPrescriptionForm && (
                <Button size="sm" onClick={() => setShowPrescriptionForm(true)}>
                  <Plus className="size-3 mr-1" />
                  Write Prescription
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {prescriptionMessage && (
                <p
                  className={`text-sm mb-3 ${prescriptionMessage.includes('saved') ? 'text-green-600' : 'text-destructive'}`}
                >
                  {prescriptionMessage}
                </p>
              )}

              {showPrescriptionForm ? (
                <div className="space-y-4">
                  <div className="grid gap-1.5">
                    <Label>Diagnosis *</Label>
                    <Input
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="e.g., Upper respiratory tract infection"
                      className="h-9"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Medications</Label>
                      <Button type="button" size="sm" variant="outline" onClick={addMedication}>
                        <Plus className="size-3 mr-1" />
                        Add
                      </Button>
                    </div>
                    {medications.map((med, i) => (
                      <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                        <Input
                          placeholder="Medicine"
                          value={med.name}
                          onChange={(e) => updateMedication(i, 'name', e.target.value)}
                          className="h-9"
                        />
                        <Input
                          placeholder="Dosage"
                          value={med.dosage}
                          onChange={(e) => updateMedication(i, 'dosage', e.target.value)}
                          className="h-9"
                        />
                        <Input
                          placeholder="Frequency"
                          value={med.frequency}
                          onChange={(e) => updateMedication(i, 'frequency', e.target.value)}
                          className="h-9"
                        />
                        <div className="flex gap-1">
                          <Input
                            placeholder="Duration"
                            value={med.duration}
                            onChange={(e) => updateMedication(i, 'duration', e.target.value)}
                            className="h-9"
                          />
                          {medications.length > 1 && (
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => removeMedication(i)}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-1.5">
                    <Label>Additional Notes</Label>
                    <textarea
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-ring"
                      value={prescriptionNotes}
                      onChange={(e) => setPrescriptionNotes(e.target.value)}
                      placeholder="Additional instructions for the patient..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={savePrescription} disabled={prescriptionSaving}>
                      {prescriptionSaving ? 'Saving...' : 'Save Prescription'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowPrescriptionForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Click &quot;Write Prescription&quot; to create a prescription for this patient.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Complete Consultation */}
          {appointment.status === 'confirmed' && (
            <Card className="border-green-200">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Finish Consultation</p>
                    <p className="text-sm text-muted-foreground">
                      Mark as complete when the consultation is done. Notes will be saved
                      automatically.
                    </p>
                  </div>
                  <Button onClick={markCompleted} disabled={completing}>
                    <Check className="size-4 mr-2" />
                    {completing ? 'Completing...' : 'Mark as Completed'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {appointment.status === 'completed' && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <p className="text-blue-700 font-medium flex items-center gap-2">
                  <Check className="size-5" />
                  This consultation has been completed.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
