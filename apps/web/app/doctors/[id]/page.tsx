'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Script from 'next/script'
import { isAxiosError } from 'axios'
import { api } from '@/lib/axios'
import { useAuth, type User } from '@/context'
import { Navbar } from '@/components/layout/navbar'
import { AuthDrawer } from '@/components/layout/auth-drawer'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Star, MapPin, GraduationCap, Clock, Sun, Moon, Video, CheckCircle } from 'lucide-react'

declare global {
  interface Window {
    Razorpay: any
  }
}

interface Doctor {
  id: number
  specialization: string
  qualification: string
  experience: number
  consultationFee: string
  bio: string | null
  hospitalName: string | null
  address: string | null
  avgRating: string
  totalReviews: number
  userName: string
  userEmail: string
  userAvatar: string | null
  userPhone: string | null
}

interface Review {
  id: number
  rating: number
  comment: string | null
  createdAt: string
  patientName: string
}

interface Slot {
  id: number
  startTime: string
  endTime: string
}

interface RazorpayResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

function getNext7Days() {
  const days = []
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push({
      date: d.toISOString().split('T')[0],
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      num: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      isSunday: d.getDay() === 0,
    })
  }
  return days
}

export default function DoctorProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const doctorId = params.id as string
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  const days = useMemo(() => getNext7Days(), [])
  const [selectedDate, setSelectedDate] = useState(days[0].date)
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)

  const [reason, setReason] = useState('')
  const [booking, setBooking] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [meetLink, setMeetLink] = useState<string | null>(null)
  const [authDrawerOpen, setAuthDrawerOpen] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const [doctorRes, reviewsRes] = await Promise.all([
          api.get(`/api/doctors/${doctorId}`),
          api.get(`/api/reviews/doctor/${doctorId}`),
        ])
        setDoctor(doctorRes.data.doctor)
        setReviews(reviewsRes.data.reviews)
      } catch {
        // handle error
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [doctorId])

  useEffect(() => {
    async function fetchSlots() {
      setLoadingSlots(true)
      setSelectedSlot(null)
      try {
        const { data } = await api.get(`/api/doctors/${doctorId}/slots`, {
          params: { date: selectedDate },
        })
        // Filter out past time slots when booking for today using locale-aware comparison
        const now = new Date()
        const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
        if (selectedDate === todayLocal) {
          const currentMinutes = now.getHours() * 60 + now.getMinutes()
          data.slots = data.slots.filter((s: Slot) => {
            const [h, m] = s.startTime.split(':').map(Number)
            return h * 60 + m > currentMinutes
          })
        }
        setSlots(data.slots)
      } catch {
        setSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }
    fetchSlots()
  }, [doctorId, selectedDate])

  function handleBooking() {
    if (!selectedSlot || !selectedDate || !doctor) return
    if (!user) {
      setAuthDrawerOpen(true)
      return
    }
    proceedWithBooking(user)
  }

  async function proceedWithBooking(authedUser: User) {
    if (!selectedSlot || !selectedDate || !doctor) return
    setBooking(true)
    setBookingError(null)

    let appointmentId: number | null = null

    try {
      const { data: appointmentData } = await api.post('/api/appointments', {
        doctorId: doctor.id,
        slotId: selectedSlot.id,
        appointmentDate: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        reason,
      })

      appointmentId = appointmentData.appointment.id

      const { data: orderData } = await api.post('/api/payments/create-order', {
        appointmentId,
      })

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'DocBook',
        description: `Consultation with ${doctor.userName}`,
        order_id: orderData.orderId,
        handler: async (response: RazorpayResponse) => {
          setBooking(false)
          setVerifying(true)
          try {
            const { data: verifyData } = await api.post('/api/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            if (verifyData.meetLink) {
              setMeetLink(verifyData.meetLink)
            }
            setSuccess(true)
          } catch {
            setBookingError('Payment verification failed. Please contact support.')
          } finally {
            setVerifying(false)
          }
        },
        modal: {
          ondismiss: async () => {
            // User closed the Razorpay modal without paying — cancel the orphaned appointment
            setBooking(false)
            if (appointmentId) {
              try {
                await api.patch(`/api/appointments/${appointmentId}/cancel`, {
                  reason: 'Payment not completed',
                })
              } catch {
                // Cancellation is best-effort
              }
            }
          },
        },
        prefill: {
          name: authedUser.name,
          email: authedUser.email,
        },
        theme: {
          color: '#2563eb',
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', () => {
        setBooking(false)
        setBookingError('Payment failed. Please try again.')
        // Cancel the orphaned appointment on payment failure
        if (appointmentId) {
          api.patch(`/api/appointments/${appointmentId}/cancel`, {
            reason: 'Payment failed',
          }).catch(() => {})
        }
      })
      rzp.open()
    } catch (err: unknown) {
      setBooking(false)
      if (isAxiosError(err)) {
        setBookingError(err.response?.data?.error || 'Failed to book appointment')
      } else {
        setBookingError('Failed to book appointment')
      }
    }
  }

  const morningSlots = slots.filter((s) => Number(s.startTime.split(':')[0]) < 12)
  const afternoonSlots = slots.filter((s) => Number(s.startTime.split(':')[0]) >= 12)

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  if (!doctor) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-lg text-muted-foreground">Doctor not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Profile Info */}
          <div className="lg:col-span-7 space-y-6">
            {/* Doctor Profile Header */}
            <Card className="overflow-hidden !p-0 !gap-0 flex-row">
              {/* Vertical photo */}
              {doctor.userAvatar ? (
                <img src={doctor.userAvatar} alt={doctor.userName} className="w-36 sm:w-44 shrink-0 object-cover !rounded-none" />
              ) : (
                <div className="w-36 sm:w-44 shrink-0 bg-primary/10 flex items-center justify-center text-primary font-bold text-4xl !rounded-none">
                  {doctor.userName.charAt(0)}
                </div>
              )}
              <CardContent className="pt-6 flex-1">
                <div className="space-y-3">
                  <div>
                    <h1 className="text-2xl font-bold">{doctor.userName}</h1>
                    <p className="text-primary font-semibold">{doctor.specialization}</p>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="size-4" />
                      {doctor.qualification}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-4" />
                      {doctor.experience} years experience
                    </span>
                    {doctor.hospitalName && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-4" />
                        {doctor.hospitalName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Star className="size-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{Number(doctor.avgRating).toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground">({doctor.totalReviews} reviews)</span>
                    </div>
                    <div className="text-lg font-bold">Rs. {doctor.consultationFee}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-5 pb-5 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Experience</p>
                  <p className="text-2xl font-extrabold text-primary">{doctor.experience}+</p>
                  <p className="text-xs text-muted-foreground">Years</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-5 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Reviews</p>
                  <p className="text-2xl font-extrabold text-primary">{doctor.totalReviews}</p>
                  <p className="text-xs text-muted-foreground">Patients</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-5 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Rating</p>
                  <p className="text-2xl font-extrabold text-primary">{Number(doctor.avgRating).toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">out of 5</p>
                </CardContent>
              </Card>
            </div>

            {/* Bio */}
            {doctor.bio && (
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{doctor.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Qualifications & Location */}
            <Card>
              <CardHeader>
                <CardTitle>Qualifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <GraduationCap className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{doctor.qualification}</p>
                    {doctor.hospitalName && (
                      <p className="text-xs text-muted-foreground">{doctor.hospitalName}</p>
                    )}
                  </div>
                </div>
                {doctor.address && (
                  <div className="flex gap-4">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="size-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Location</p>
                      <p className="text-xs text-muted-foreground">{doctor.address}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle>Patient Reviews ({doctor.totalReviews})</CardTitle>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <p className="text-muted-foreground">No reviews yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="bg-muted/30 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                              {review.patientName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{review.patientName}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`size-3 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-muted-foreground italic">&ldquo;{review.comment}&rdquo;</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Slot Picker */}
          <div className="lg:col-span-5">
            <div className="sticky top-20">
              <Card>
                <CardHeader>
                  <CardTitle>Book Appointment</CardTitle>
                  <p className="text-sm text-muted-foreground">Choose your preferred consultation time</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 7-day date picker */}
                  <div className="flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Select appointment date">
                    {days.map((d) => (
                      <button
                        key={d.date}
                        disabled={d.isSunday}
                        onClick={() => setSelectedDate(d.date)}
                        aria-label={`${d.day}, ${d.month} ${d.num}${d.isSunday ? ' (unavailable)' : ''}${selectedDate === d.date ? ' (selected)' : ''}`}
                        aria-pressed={selectedDate === d.date}
                        className={`flex-shrink-0 w-14 h-18 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors ${
                          d.isSunday
                            ? 'opacity-40 cursor-not-allowed bg-muted'
                            : selectedDate === d.date
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        <span className="text-[10px] uppercase font-bold tracking-wider">{d.day}</span>
                        <span className="text-xl font-extrabold">{d.num}</span>
                      </button>
                    ))}
                  </div>

                  {/* Slots */}
                  {loadingSlots ? (
                    <div className="flex justify-center py-6">
                      <div className="animate-spin h-6 w-6 rounded-full border-3 border-primary border-t-transparent" />
                    </div>
                  ) : slots.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No available slots for this date.</p>
                  ) : (
                    <div className="space-y-5">
                      {morningSlots.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                            <Sun className="size-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Morning</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {morningSlots.map((slot) => (
                              <button
                                key={slot.id}
                                onClick={() => setSelectedSlot(slot)}
                                aria-label={`${slot.startTime.slice(0, 5)} time slot${selectedSlot?.id === slot.id ? ' (selected)' : ''}`}
                                aria-pressed={selectedSlot?.id === slot.id}
                                className={`py-2.5 px-2 rounded-xl text-sm font-semibold transition-colors ${
                                  selectedSlot?.id === slot.id
                                    ? 'border-2 border-primary bg-primary/5 text-primary'
                                    : 'bg-muted hover:bg-primary/10 hover:text-primary'
                                }`}
                              >
                                {slot.startTime.slice(0, 5)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {afternoonSlots.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                            <Moon className="size-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Afternoon</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {afternoonSlots.map((slot) => (
                              <button
                                key={slot.id}
                                onClick={() => setSelectedSlot(slot)}
                                aria-label={`${slot.startTime.slice(0, 5)} time slot${selectedSlot?.id === slot.id ? ' (selected)' : ''}`}
                                aria-pressed={selectedSlot?.id === slot.id}
                                className={`py-2.5 px-2 rounded-xl text-sm font-semibold transition-colors ${
                                  selectedSlot?.id === slot.id
                                    ? 'border-2 border-primary bg-primary/5 text-primary'
                                    : 'bg-muted hover:bg-primary/10 hover:text-primary'
                                }`}
                              >
                                {slot.startTime.slice(0, 5)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reason */}
                  {selectedSlot && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Reason for visit (optional)</label>
                      <textarea
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        placeholder="Briefly describe your symptoms..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </div>
                  )}

                  {bookingError && (
                    <p className="text-sm text-destructive">{bookingError}</p>
                  )}

                  {/* Fee + Book */}
                  <div className="pt-4 border-t space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Consultation Fee</span>
                      <span className="text-lg font-extrabold">Rs. {doctor.consultationFee}</span>
                    </div>
                    <Button
                      size="lg"
                      className="w-full gap-2"
                      disabled={!selectedSlot || booking || verifying || success}
                      onClick={handleBooking}
                    >
                      {(booking || verifying) ? (
                        <>
                          <div className="animate-spin h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent" />
                          {verifying ? 'Confirming booking...' : 'Processing...'}
                        </>
                      ) : success ? (
                        'Booked!'
                      ) : (
                        <>
                          <Video className="size-4" />
                          {`Pay Rs. ${doctor.consultationFee} & Book`}
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Success state */}
                  {success && (
                    <div className="pt-4 border-t text-center space-y-3">
                      <div className="size-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
                        <CheckCircle className="size-6" />
                      </div>
                      <div>
                        <p className="font-semibold">Booking Confirmed!</p>
                        <p className="text-sm text-muted-foreground">Your appointment has been confirmed.</p>
                      </div>
                      {meetLink && (
                        <a href={meetLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline break-all block">
                          {meetLink}
                        </a>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/dashboard/patient/appointments')}
                      >
                        View Appointments
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <AuthDrawer
        open={authDrawerOpen}
        onClose={() => setAuthDrawerOpen(false)}
        onSuccess={(u) => proceedWithBooking(u)}
      />
    </div>
  )
}
