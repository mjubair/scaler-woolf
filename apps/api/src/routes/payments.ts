import { Router, type Request, type Response } from 'express'
import crypto from 'crypto'
import { requireAuth, requireRole } from '../middleware/auth'
import { getAppointmentById, updateAppointmentStatus, setAppointmentMeetLink } from '../services/appointment.service'
import {
  createRazorpayOrder,
  verifyPayment,
  getPaymentByAppointmentId,
} from '../services/payment.service'
import { getDoctorById } from '../services/doctor.service'
import { createCalendarEvent } from '../services/calendar.service'
import {
  sendBookingConfirmation,
  sendBookingNotificationToDoctor,
  sendPaymentReceipt,
} from '../services/email.service'
import { createNotification } from '../services/notification.service'

const router = Router()

// Shared helper: after payment is confirmed, create calendar event + send emails.
// Awaits all operations so they complete before the response is sent.
// Each step is wrapped individually so one failure doesn't skip the rest.
async function handlePostPaymentConfirmation(appointmentId: number, razorpayPaymentId?: string) {
  const appointment = await getAppointmentById(appointmentId)
  if (!appointment) return { meetLink: null }

  const doctor = await getDoctorById(appointment.doctorId)
  if (!doctor) return { meetLink: null }

  // 1. Create Google Calendar event with Meet link
  let meetLink: string | null = null
  try {
    const calendarResult = await createCalendarEvent({
      doctorId: appointment.doctorId,
      summary: `Consultation: ${appointment.patientName} with Dr. ${appointment.doctorName}`,
      description: `Online consultation booked via DocBook.\nReason: ${appointment.reason || 'General consultation'}`,
      startDateTime: `${appointment.appointmentDate}T${appointment.startTime}`,
      endDateTime: `${appointment.appointmentDate}T${appointment.endTime}`,
      patientEmail: appointment.patientEmail,
      doctorEmail: appointment.doctorEmail,
    })

    if (calendarResult && !('error' in calendarResult) && calendarResult.meetLink && calendarResult.eventId) {
      meetLink = calendarResult.meetLink
      await setAppointmentMeetLink(appointmentId, calendarResult.meetLink, calendarResult.eventId)
    }
  } catch (err) {
    console.error('Failed to create calendar event:', err)
  }

  // 2. Send booking confirmation to patient
  try {
    await sendBookingConfirmation({
      patientEmail: appointment.patientEmail,
      patientName: appointment.patientName,
      doctorName: appointment.doctorName,
      date: appointment.appointmentDate,
      time: appointment.startTime,
      meetLink: meetLink || undefined,
    })
  } catch (err) {
    console.error('Failed to send booking confirmation:', err)
  }

  // 3. Notify doctor about the new booking
  try {
    await sendBookingNotificationToDoctor({
      doctorEmail: appointment.doctorEmail,
      doctorName: appointment.doctorName,
      patientName: appointment.patientName,
      date: appointment.appointmentDate,
      time: appointment.startTime,
      reason: appointment.reason || undefined,
    })
  } catch (err) {
    console.error('Failed to send doctor notification:', err)
  }

  // 4. Send payment receipt to patient
  if (razorpayPaymentId) {
    try {
      await sendPaymentReceipt({
        patientEmail: appointment.patientEmail,
        patientName: appointment.patientName,
        doctorName: appointment.doctorName,
        amount: String(doctor.consultationFee),
        date: appointment.appointmentDate,
        paymentId: razorpayPaymentId,
      })
    } catch (err) {
      console.error('Failed to send payment receipt:', err)
    }
  }

  // 5. Create in-app notifications for both patient and doctor
  try {
    await createNotification({
      userId: appointment.patientId,
      type: 'booking_confirmed',
      title: 'Appointment Confirmed',
      message: `Your appointment with Dr. ${appointment.doctorName} on ${appointment.appointmentDate} has been confirmed.`,
      metadata: { appointmentId, meetLink },
    })
  } catch (err) {
    console.error('Failed to create patient notification:', err)
  }

  try {
    // Get doctor's userId from the doctor record
    await createNotification({
      userId: doctor.userId,
      type: 'new_booking',
      title: 'New Appointment',
      message: `${appointment.patientName} has booked an appointment on ${appointment.appointmentDate}.`,
      metadata: { appointmentId },
    })
  } catch (err) {
    console.error('Failed to create doctor notification:', err)
  }

  return { meetLink }
}

// POST /api/payments/create-order — create Razorpay order for an appointment
router.post(
  '/create-order',
  requireAuth,
  requireRole('patient'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { appointmentId } = req.body

      if (!appointmentId) {
        res.status(400).json({ error: 'appointmentId is required' })
        return
      }

      const appointment = await getAppointmentById(appointmentId)
      if (!appointment) {
        res.status(404).json({ error: 'Appointment not found' })
        return
      }

      if (appointment.patientId !== req.user!.userId) {
        res.status(403).json({ error: 'You can only pay for your own appointments' })
        return
      }

      if (appointment.status !== 'pending') {
        res.status(400).json({ error: 'Appointment is not in pending status' })
        return
      }

      // Check if already paid
      const existingPayment = await getPaymentByAppointmentId(appointmentId)
      if (existingPayment && existingPayment.status === 'paid') {
        res.status(400).json({ error: 'Payment already completed for this appointment' })
        return
      }

      // Get doctor's consultation fee
      const doctor = await getDoctorById(appointment.doctorId)
      if (!doctor) {
        res.status(404).json({ error: 'Doctor not found' })
        return
      }

      const amount = Number(doctor.consultationFee)
      const { payment, order } = await createRazorpayOrder(appointmentId, req.user!.userId, amount)

      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        paymentId: payment.id,
        keyId: process.env.RAZORPAY_KEY_ID,
      })
    } catch (error) {
      res.status(500).json({ error: 'Failed to create payment order' })
    }
  },
)

// POST /api/payments/verify — verify Razorpay payment and confirm appointment
router.post(
  '/verify',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        res.status(400).json({ error: 'Payment verification details are required' })
        return
      }

      const result = await verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature)

      if (!result.valid) {
        res.status(400).json({ error: 'Payment verification failed' })
        return
      }

      // Confirm the appointment and trigger post-payment flow
      let meetLink: string | null = null
      if (result.payment) {
        await updateAppointmentStatus(result.payment.appointmentId, 'confirmed')

        // Create calendar event + send emails (awaited, but individually wrapped)
        const postResult = await handlePostPaymentConfirmation(
          result.payment.appointmentId,
          razorpay_payment_id,
        )
        meetLink = postResult?.meetLink ?? null
      }

      res.json({
        message: 'Payment verified successfully',
        payment: result.payment,
        meetLink,
      })
    } catch (error) {
      res.status(500).json({ error: 'Failed to verify payment' })
    }
  },
)

// POST /api/payments/webhook — Razorpay webhook handler
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!webhookSecret) {
      res.status(500).json({ error: 'Webhook secret not configured' })
      return
    }

    const signature = req.headers['x-razorpay-signature'] as string
    const body = JSON.stringify(req.body)
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex')

    if (signature !== expectedSignature) {
      res.status(400).json({ error: 'Invalid webhook signature' })
      return
    }

    const event = req.body.event
    const payload = req.body.payload

    if (event === 'payment.captured') {
      const orderId = payload.payment.entity.order_id
      const paymentId = payload.payment.entity.id

      // Verify and update payment
      const result = await verifyPayment(orderId, paymentId, signature)
      if (result.valid && result.payment) {
        await updateAppointmentStatus(result.payment.appointmentId, 'confirmed')

        // Create calendar event + send emails (awaited)
        await handlePostPaymentConfirmation(result.payment.appointmentId, paymentId)
      }
    }

    res.json({ status: 'ok' })
  } catch (error) {
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

// GET /api/payments/appointment/:appointmentId — get payment status
router.get(
  '/appointment/:appointmentId',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const appointmentId = Number(req.params.appointmentId)
      const payment = await getPaymentByAppointmentId(appointmentId)

      if (!payment) {
        res.status(404).json({ error: 'Payment not found' })
        return
      }

      res.json({ payment })
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch payment' })
    }
  },
)

export default router
