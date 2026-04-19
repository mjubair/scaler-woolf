'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { isAxiosError } from 'axios'
import { api } from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from '@/components/ui'
import { Calendar, Clock, Video, X, Star, Paperclip, Upload, Trash2, FileText, Image, MessageSquare, Hourglass } from 'lucide-react'

interface Appointment {
  id: number
  appointmentDate: string
  startTime: string | null
  endTime: string | null
  status: string
  reason: string | null
  patientNote: string | null
  googleMeetLink: string | null
  doctorName: string | null
  doctorSpecialization: string | null
  doctorAvatar: string | null
  reviewId: number | null
  reviewRating: number | null
  reviewComment: string | null
}

interface Attachment {
  id: number
  fileName: string
  fileType: string
  fileSize: number
  cloudinaryUrl: string
  createdAt: string
}

export default function PatientAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [filter, setFilter] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Review form state
  const [reviewingId, setReviewingId] = useState<number | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewMessage, setReviewMessage] = useState('')

  // Attachment state
  const [attachingId, setAttachingId] = useState<number | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')

  // Patient note state
  const [noteEditingId, setNoteEditingId] = useState<number | null>(null)
  const [noteValue, setNoteValue] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteMessage, setNoteMessage] = useState('')

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

  async function submitReview(appointmentId: number) {
    setReviewSubmitting(true)
    setReviewMessage('')
    try {
      await api.post('/api/reviews', {
        appointmentId,
        rating: reviewRating,
        comment: reviewComment || undefined,
      })
      setReviewMessage('Review submitted!')
      setReviewingId(null)
      setReviewRating(5)
      setReviewComment('')
      fetchAppointments()
    } catch (err: unknown) {
      setReviewMessage(isAxiosError(err) ? (err.response?.data?.error || 'Failed to submit review') : 'Failed to submit review')
    } finally {
      setReviewSubmitting(false)
    }
  }

  function toggleNote(apt: Appointment) {
    if (noteEditingId === apt.id) {
      setNoteEditingId(null)
      setNoteValue('')
      setNoteMessage('')
      return
    }
    setNoteEditingId(apt.id)
    setNoteValue(apt.patientNote ?? '')
    setNoteMessage('')
  }

  async function saveNote(appointmentId: number) {
    setNoteSaving(true)
    setNoteMessage('')
    try {
      await api.patch(`/api/appointments/${appointmentId}/patient-note`, { note: noteValue })
      setNoteMessage('Saved')
      fetchAppointments()
    } catch (err: unknown) {
      setNoteMessage(isAxiosError(err) ? (err.response?.data?.error || 'Failed to save note') : 'Failed to save note')
    } finally {
      setNoteSaving(false)
    }
  }

  async function toggleAttachments(appointmentId: number) {
    if (attachingId === appointmentId) {
      setAttachingId(null)
      setAttachments([])
      setUploadMessage('')
      return
    }
    setAttachingId(appointmentId)
    setUploadMessage('')
    try {
      const { data } = await api.get(`/api/attachments/appointment/${appointmentId}`)
      setAttachments(data.attachments)
    } catch {
      setAttachments([])
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, appointmentId: number) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setUploadMessage('File must be under 10MB')
      return
    }

    setUploading(true)
    setUploadMessage('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('appointmentId', String(appointmentId))

      await api.post('/api/attachments/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      // Refresh attachments
      const { data } = await api.get(`/api/attachments/appointment/${appointmentId}`)
      setAttachments(data.attachments)
      setUploadMessage('File uploaded successfully')
    } catch (err: unknown) {
      setUploadMessage(isAxiosError(err) ? (err.response?.data?.error || 'Upload failed') : 'Upload failed')
    } finally {
      setUploading(false)
      // Reset file input
      e.target.value = ''
    }
  }

  async function deleteAttachment(attachmentId: number, appointmentId: number) {
    if (!confirm('Delete this file?')) return
    try {
      await api.delete(`/api/attachments/${attachmentId}`)
      const { data } = await api.get(`/api/attachments/appointment/${appointmentId}`)
      setAttachments(data.attachments)
    } catch {
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function getFileIcon(fileType: string) {
    if (fileType.startsWith('image/')) return <Image className="size-4 text-blue-500" />
    return <FileText className="size-4 text-red-500" />
  }

  function formatTimeUntil(dateStr: string, timeStr: string | null): { text: string; soon: boolean } | null {
    if (!timeStr) return null
    const target = new Date(`${dateStr}T${timeStr}`)
    const diffMs = target.getTime() - Date.now()
    if (diffMs < 0) return null
    const MIN = 60 * 1000
    const HOUR = 60 * MIN
    const DAY = 24 * HOUR
    if (diffMs <= 30 * MIN) return { text: 'Starting soon', soon: true }
    if (diffMs < HOUR) {
      const m = Math.round(diffMs / MIN)
      return { text: `In ${m} minute${m === 1 ? '' : 's'}`, soon: false }
    }
    if (diffMs < DAY) {
      const h = Math.round(diffMs / HOUR)
      return { text: `In ${h} hour${h === 1 ? '' : 's'}`, soon: false }
    }
    const d = Math.round(diffMs / DAY)
    return { text: `In ${d} day${d === 1 ? '' : 's'}`, soon: false }
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
      <div className="bg-muted/50 p-1.5 rounded-xl inline-flex items-center gap-1">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f ? f.charAt(0).toUpperCase() + f.slice(1) : 'All'}
          </button>
        ))}
      </div>

      {reviewMessage && (
        <p className={`text-sm ${reviewMessage.includes('submitted') ? 'text-green-600' : 'text-destructive'}`}>
          {reviewMessage}
        </p>
      )}

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
        <div className="space-y-4">
          {appointments.map((apt) => {
            const date = new Date(apt.appointmentDate)
            const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
            const day = date.getDate().toString().padStart(2, '0')
            const time = apt.startTime?.slice(0, 5)
            const timeUntil =
              apt.status === 'pending' || apt.status === 'confirmed'
                ? formatTimeUntil(apt.appointmentDate, apt.startTime)
                : null

            return (
            <Card key={apt.id} className="overflow-hidden">
              <CardContent className="pt-5 pb-5">
                <div className="flex flex-col md:flex-row gap-5">
                  {/* Doctor avatar */}
                  {apt.doctorAvatar ? (
                    <img src={apt.doctorAvatar} alt={apt.doctorName ?? undefined} className="size-16 md:size-20 rounded-2xl object-cover shrink-0" />
                  ) : (
                    <div className="size-16 md:size-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl md:text-3xl shrink-0">
                      {apt.doctorName?.charAt(0)}
                    </div>
                  )}

                  {/* Details column */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                        apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        apt.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                        apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {apt.status}
                      </span>
                      {apt.googleMeetLink && apt.status === 'confirmed' && (
                        <span className="text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-primary/10 text-primary">
                          Video Consultation
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold mb-0.5">{apt.doctorName}</h3>
                    <p className="text-sm text-primary font-medium mb-2">{apt.doctorSpecialization}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="size-3.5" />
                        {month} {day}, {date.getFullYear()}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3.5" />
                        {time} - {apt.endTime?.slice(0, 5)}
                      </span>
                      {timeUntil && (
                        <span className={`flex items-center gap-1.5 ${timeUntil.soon ? 'text-primary font-semibold' : ''}`}>
                          <Hourglass className="size-3.5" />
                          {timeUntil.text}
                        </span>
                      )}
                    </div>
                    {apt.reason && (
                      <p className="text-sm text-muted-foreground mt-2">Reason: {apt.reason}</p>
                    )}
                    {apt.googleMeetLink && apt.status === 'confirmed' && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                        <Video className="size-4 text-primary" />
                        <span>Video Link Ready</span>
                      </div>
                    )}
                  </div>

                  {/* Actions column */}
                  <div className="flex flex-row md:flex-col justify-end gap-2 shrink-0">
                    {apt.googleMeetLink && apt.status === 'confirmed' && (
                      <a href={apt.googleMeetLink} target="_blank" rel="noopener noreferrer">
                        <button className="flex items-center justify-center gap-1.5 bg-primary text-primary-foreground px-5 py-2.5 rounded-full font-semibold text-sm hover:opacity-90 transition-all w-full">
                          Join Call
                          <span className="text-xs">→</span>
                        </button>
                      </a>
                    )}
                    {(apt.status === 'pending' || apt.status === 'confirmed') && (
                      <button
                        onClick={() => toggleNote(apt)}
                        className="flex items-center justify-center gap-1.5 bg-muted text-foreground px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-muted/80 transition-all"
                      >
                        <MessageSquare className="size-3.5" />
                        Note
                      </button>
                    )}
                    {(apt.status === 'pending' || apt.status === 'confirmed') && (
                      <button
                        onClick={() => toggleAttachments(apt.id)}
                        className="flex items-center justify-center gap-1.5 bg-muted text-foreground px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-muted/80 transition-all"
                      >
                        <Paperclip className="size-3.5" />
                        Files
                      </button>
                    )}
                    {apt.status === 'completed' && apt.reviewId === null && (
                      <button
                        onClick={() => setReviewingId(reviewingId === apt.id ? null : apt.id)}
                        className="flex items-center justify-center gap-1.5 bg-muted text-foreground px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-muted/80 transition-all"
                      >
                        <Star className="size-3.5" />
                        Review
                      </button>
                    )}
                    {apt.status === 'completed' && apt.reviewId !== null && (
                      <span className="flex items-center justify-center gap-1.5 bg-yellow-50 text-yellow-700 px-5 py-2.5 rounded-full font-semibold text-sm">
                        <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
                        Reviewed {apt.reviewRating}
                      </span>
                    )}
                    {(apt.status === 'pending' || apt.status === 'confirmed') && (
                      <button
                        onClick={() => cancelAppointment(apt.id)}
                        className="text-destructive font-semibold text-sm px-5 py-2.5 rounded-full hover:bg-destructive/10 transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Patient Note Section */}
                {noteEditingId === apt.id && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <Label className="text-sm font-medium">Note to doctor</Label>
                    <textarea
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                      placeholder="Share any details the doctor should know before the call..."
                      value={noteValue}
                      onChange={(e) => setNoteValue(e.target.value)}
                    />
                    {noteMessage && (
                      <p className={`text-xs ${noteMessage === 'Saved' ? 'text-green-600' : 'text-destructive'}`}>
                        {noteMessage}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveNote(apt.id)} disabled={noteSaving}>
                        {noteSaving ? 'Saving...' : 'Save Note'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleNote(apt)}>
                        Close
                      </Button>
                    </div>
                  </div>
                )}

                {/* Attachments Section */}
                {attachingId === apt.id && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Attached Files</Label>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                          onChange={(e) => handleFileUpload(e, apt.id)}
                          disabled={uploading}
                        />
                        <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                          <Upload className="size-3" />
                          {uploading ? 'Uploading...' : 'Upload File'}
                        </span>
                      </label>
                    </div>

                    {uploadMessage && (
                      <p className={`text-xs ${uploadMessage.includes('success') ? 'text-green-600' : 'text-destructive'}`}>
                        {uploadMessage}
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Max 5 files, 10MB each. Accepted: JPEG, PNG, PDF, DOC, DOCX
                    </p>

                    {attachments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {attachments.map((att) => (
                          <div key={att.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {getFileIcon(att.fileType)}
                              <a
                                href={att.cloudinaryUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary underline truncate"
                              >
                                {att.fileName}
                              </a>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {formatFileSize(att.fileSize)}
                              </span>
                            </div>
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              onClick={() => deleteAttachment(att.id, apt.id)}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Inline Review Form */}
                {reviewingId === apt.id && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div>
                      <Label className="text-sm mb-1 block">Rating</Label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            className="focus:outline-none"
                          >
                            <Star
                              className={`size-6 transition-colors ${
                                star <= reviewRating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-muted-foreground/30 hover:text-yellow-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm mb-1 block">Comment (optional)</Label>
                      <textarea
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="How was your experience?"
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => submitReview(apt.id)} disabled={reviewSubmitting}>
                        {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setReviewingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
