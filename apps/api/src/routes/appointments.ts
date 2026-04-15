import { Router, type Request, type Response } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import { getDoctorByUserId, getDoctorById } from '../services/doctor.service'
import {
  createAppointment,
  getAppointmentById,
  getPatientAppointments,
  getDoctorAppointments,
  updateAppointmentNotes,
  updateAppointmentStatus,
} from '../services/appointment.service'
import { deleteCalendarEvent } from '../services/calendar.service'
import { sendCancellationEmail, sendConsultationCompletedEmail } from '../services/email.service'
import { createNotification } from '../services/notification.service'

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

    // Post-completion actions: notify patient, prompt doctor
    if (status === 'completed') {
      const appointment = await getAppointmentById(appointmentId)
      if (appointment) {
        // Email patient that consultation is complete
        try {
          await sendConsultationCompletedEmail({
            patientEmail: appointment.patientEmail,
            patientName: appointment.patientName,
            doctorName: appointment.doctorName,
            date: appointment.appointmentDate,
            time: appointment.startTime,
          })
        } catch (err) {
          console.error('Failed to send completion email:', err)
        }

        // In-app notification for patient
        try {
          await createNotification({
            userId: appointment.patientId,
            type: 'consultation_completed',
            title: 'Consultation Completed',
            message: `Your consultation with Dr. ${appointment.doctorName} is complete. Check your prescriptions or leave a review.`,
            metadata: { appointmentId },
          })
        } catch (err) {
          console.error('Failed to create patient completion notification:', err)
        }

        // In-app notification for doctor — reminder to write prescription
        try {
          const doctor = await getDoctorById(appointment.doctorId)
          if (doctor) {
            await createNotification({
              userId: doctor.userId,
              type: 'write_prescription',
              title: 'Write Prescription',
              message: `Consultation with ${appointment.patientName} is complete. Don't forget to upload the prescription.`,
              metadata: { appointmentId },
            })
          }
        } catch (err) {
          console.error('Failed to create doctor prescription reminder:', err)
        }
      }
    }

    res.json({ appointment: updated })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update appointment status' })
  }
})

// PATCH /api/appointments/:id/notes — save doctor's consultation notes
router.patch('/:id/notes', requireAuth, requireRole('doctor'), async (req: Request, res: Response): Promise<void> => {
  try {
    const appointmentId = Number(req.params.id)
    const { notes } = req.body

    if (notes === undefined) {
      res.status(400).json({ error: 'notes field is required' })
      return
    }

    // Verify appointment belongs to this doctor
    const appointment = await getAppointmentById(appointmentId)
    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' })
      return
    }

    const doctor = await getDoctorByUserId(req.user!.userId)
    if (!doctor || appointment.doctorId !== doctor.id) {
      res.status(403).json({ error: 'You can only update notes for your own appointments' })
      return
    }

    const updated = await updateAppointmentNotes(appointmentId, notes)
    res.json({ appointment: updated })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notes' })
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

    // Create in-app notifications for cancellation
    try {
      await createNotification({
        userId: appointment.patientId,
        type: 'appointment_cancelled',
        title: 'Appointment Cancelled',
        message: `Your appointment with Dr. ${appointment.doctorName} on ${appointment.appointmentDate} has been cancelled.`,
        metadata: { appointmentId, cancelledBy },
      })
    } catch (err) {
      console.error('Failed to create patient cancellation notification:', err)
    }

    try {
      const doctor = await getDoctorById(appointment.doctorId)
      if (doctor) {
        await createNotification({
          userId: doctor.userId,
          type: 'appointment_cancelled',
          title: 'Appointment Cancelled',
          message: `Appointment with ${appointment.patientName} on ${appointment.appointmentDate} has been cancelled by ${cancelledBy}.`,
          metadata: { appointmentId, cancelledBy },
        })
      }
    } catch (err) {
      console.error('Failed to create doctor cancellation notification:', err)
    }

    res.json({ appointment: updated })
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel appointment' })
  }
})

export default router
