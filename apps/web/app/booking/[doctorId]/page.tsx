'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Script from 'next/script'
import { api } from '@/lib/axios'
import { useAuth } from '@/context'
import { Navbar } from '@/components/layout/navbar'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/components/ui'
import { Calendar, Clock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

declare global {
  interface Window {
    Razorpay: any
  }
}

interface Doctor {
  id: number
  specialization: string
  consultationFee: string
  userName: string
}

interface Slot {
  id: number
  dayOfWeek: number
  startTime: string
  endTime: string
}

export default function BookingPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const doctorId = params.doctorId as string

  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function fetchDoctor() {
      try {
        const { data } = await api.get(`/api/doctors/${doctorId}`)
        setDoctor(data.doctor)
      } catch {
        setError('Failed to load doctor information')
      } finally {
        setLoading(false)
      }
    }
    fetchDoctor()
  }, [doctorId])

  useEffect(() => {
    if (!selectedDate) return
    async function fetchSlots() {
      try {
        const { data } = await api.get(`/api/doctors/${doctorId}/slots`, {
          params: { date: selectedDate },
        })
        setSlots(data.slots)
        setSelectedSlot(null)
      } catch {
        setSlots([])
      }
    }
    fetchSlots()
  }, [selectedDate, doctorId])

  async function handleBooking() {
    if (!selectedSlot || !selectedDate || !doctor) return
    setBooking(true)
    setError(null)

    try {
      // Step 1: Create appointment
      const { data: appointmentData } = await api.post('/api/appointments', {
        doctorId: doctor.id,
        slotId: selectedSlot.id,
        appointmentDate: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        reason,
      })

      const appointmentId = appointmentData.appointment.id

      // Step 2: Create Razorpay order
      const { data: orderData } = await api.post('/api/payments/create-order', {
        appointmentId,
      })

      // Step 3: Open Razorpay checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'DocBook',
        description: `Consultation with ${doctor.userName}`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            // Step 4: Verify payment
            await api.post('/api/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            setSuccess(true)
          } catch {
            setError('Payment verification failed. Please contact support.')
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: {
          color: '#0F172A',
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', () => {
        setError('Payment failed. Please try again.')
      })
      rzp.open()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to book appointment')
    } finally {
      setBooking(false)
    }
  }

  // Get min date (today)
  const today = new Date().toISOString().split('T')[0]

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

  if (success) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="size-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto text-2xl">
                &#10003;
              </div>
              <h2 className="text-xl font-semibold">Booking Confirmed!</h2>
              <p className="text-muted-foreground">
                Your appointment with {doctor?.userName} has been confirmed.
                You&apos;ll receive a Google Meet link via email.
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/dashboard/patient/appointments">
                  <Button>View Appointments</Button>
                </Link>
                <Link href="/doctors">
                  <Button variant="outline">Browse Doctors</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <main className="flex-1 mx-auto w-full max-w-2xl px-4 sm:px-6 py-8">
        <Link href={`/doctors/${doctorId}`} className="flex items-center gap-1 text-sm text-muted-foreground mb-6 hover:text-foreground">
          <ArrowLeft className="size-4" />
          Back to doctor profile
        </Link>

        <h1 className="text-2xl font-bold mb-6">Book Consultation</h1>

        {doctor && (
          <Card className="mb-6">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  {doctor.userName.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{doctor.userName}</p>
                  <p className="text-sm text-muted-foreground">{doctor.specialization}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="font-semibold">Rs. {doctor.consultationFee}</p>
                  <p className="text-xs text-muted-foreground">per consultation</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Date Selection */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="size-4" />
              Select Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="date"
              min={today}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-10 max-w-[200px]"
            />
          </CardContent>
        </Card>

        {/* Time Slot Selection */}
        {selectedDate && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-4" />
                Select Time Slot
              </CardTitle>
            </CardHeader>
            <CardContent>
              {slots.length === 0 ? (
                <p className="text-muted-foreground">No available slots for this date.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot)}
                      className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                        selectedSlot?.id === slot.id
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {slot.startTime.slice(0, 5)}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Reason */}
        {selectedSlot && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Reason for Visit (optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Briefly describe your symptoms or reason for consultation..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </CardContent>
          </Card>
        )}

        {error && <p className="text-sm text-destructive mb-4">{error}</p>}

        {selectedSlot && (
          <Button
            size="lg"
            className="w-full"
            onClick={handleBooking}
            disabled={booking}
          >
            {booking ? 'Processing...' : `Pay Rs. ${doctor?.consultationFee} & Book`}
          </Button>
        )}
      </main>
    </div>
  )
}
