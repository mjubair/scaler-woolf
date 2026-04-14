import { Router, type Request, type Response } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import { getDoctorByUserId, getDoctorById } from '../services/doctor.service'
import {
  createAppointment,
  getAppointmentById,
  getPatientAppointments,
  getDoctorAppointments,
  updateAppointmentStatus,
} from '../services/appointment.service'
import { deleteCalendarEvent } from '../services/calendar.service'
import { sendCancellationEmail } from '../services/email.service'

const router = Router()

// POST /api/appointments — book an appointment (patient only)
router.post(
  '/',
  requireAuth,
  requireRole('patient'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { doctorId, slotId, appointmentDate, startTime, endTime, reason } = req.body

      if (!doctorId || !slotId || !appointmentDate || !startTime || !endTime) {
        res
          .status(400)
          .json({ error: 'doctorId, slotId, appointmentDate, startTime, and endTime are required' })
        return
      }

      const result = await createAppointment({
        patientId: req.user!.userId,
        doctorId,
        slotId,
        appointmentDate,
        startTime,
        endTime,
        reason,
      })

      if ('error' in result) {
        res.status(400).json({ error: result.error })
        return
      }

      res.status(201).json({ appointment: result.appointment })
    } catch (error) {
      res.status(500).json({ error: 'Failed to create appointment' })
    }
  },
)

// GET /api/appointments/my — list own appointments (role-aware)
router.get('/my', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string | undefined

    if (req.user!.role === 'patient') {
      const appointments = await getPatientAppointments(req.user!.userId, status)
      res.json({ appointments })
      return
    }

    if (req.user!.role === 'doctor') {
      const doctor = await getDoctorByUserId(req.user!.userId)
      if (!doctor) {
        res.status(404).json({ error: 'Doctor profile not found' })
        return
      }
      const appointments = await getDoctorAppointments(doctor.id, status)
      res.json({ appointments })
      return
    }

    res.status(403).json({ error: 'Access denied' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointments' })
  }
})

// GET /api/appointments/:id — appointment details
router.get('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const appointmentId = Number(req.params.id)
    const appointment = await getAppointmentById(appointmentId)

    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' })
      return
    }

    // Ensure user can only see their own appointments (unless admin)
    if (req.user!.role === 'patient' && appointment.patientId !== req.user!.userId) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    res.json({ appointment })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointment' })
  }
})

// PATCH /api/appointments/:id/status — update appointment status
router.patch('/:id/status', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const appointmentId = Number(req.params.id)
    const { status } = req.body

    const validStatuses = ['confirmed', 'completed', 'no_show']
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` })
      return
    }

    // Only doctors can confirm/complete appointments
    if (req.user!.role !== 'doctor' && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Only doctors can update appointment status' })
      return
    }

    const updated = await updateAppointmentStatus(appointmentId, status)
    if (!updated) {
      res.status(404).json({ error: 'Appointment not found' })
      return
    }

    res.json({ appointment: updated })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update appointment status' })
  }
})

// PATCH /api/appointments/:id/cancel — cancel appointment
router.patch('/:id/cancel', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const appointmentId = Number(req.params.id)
    const { reason } = req.body

    const appointment = await getAppointmentById(appointmentId)
    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' })
      return
    }

    if (appointment.status === 'cancelled' || appointment.status === 'completed') {
      res.status(400).json({ error: 'Cannot cancel this appointment' })
      return
    }

    // Determine who is cancelling
    let cancelledBy: 'patient' | 'doctor' | 'admin'
    if (req.user!.role === 'admin') {
      cancelledBy = 'admin'
    } else if (req.user!.role === 'doctor') {
      cancelledBy = 'doctor'
    } else if (req.user!.userId === appointment.patientId) {
      cancelledBy = 'patient'
    } else {
      res.status(403).json({ error: 'You cannot cancel this appointment' })
      return
    }

    const updated = await updateAppointmentStatus(appointmentId, 'cancelled', {
      cancelledBy,
      cancellationReason: reason,
    })

    // Post-cancellation: delete calendar event + send emails (awaited, individually wrapped)

    // Delete Google Calendar event if one exists
    if (appointment.googleEventId) {
      try {
        await deleteCalendarEvent(appointment.doctorId, appointment.googleEventId)
      } catch (err) {
        console.error('Failed to delete calendar event:', err)
      }
    }

    // Send cancellation email to patient
    try {
      await sendCancellationEmail({
        email: appointment.patientEmail,
        name: appointment.patientName,
        doctorName: appointment.doctorName,
        date: appointment.appointmentDate,
        time: appointment.startTime,
        reason: reason || undefined,
        cancelledBy,
      })
    } catch (err) {
      console.error('Failed to send patient cancellation email:', err)
    }

    // Send cancellation email to doctor
    try {
      await sendCancellationEmail({
        email: appointment.doctorEmail,
        name: appointment.doctorName,
        doctorName: appointment.doctorName,
        date: appointment.appointmentDate,
        time: appointment.startTime,
        reason: reason || undefined,
        cancelledBy,
      })
    } catch (err) {
      console.error('Failed to send doctor cancellation email:', err)
    }

    res.json({ appointment: updated })
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel appointment' })
  }
})

export default router
