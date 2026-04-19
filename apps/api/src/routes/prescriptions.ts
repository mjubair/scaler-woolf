import { Router, type Request, type Response } from 'express'
import { eq, and, desc } from 'drizzle-orm'
import { db } from '../db'
import { prescriptions, appointments, doctors, users } from '../db/schema'
import { requireAuth, requireRole } from '../middleware/auth'
import { getDoctorByUserId } from '../services/doctor.service'
import { sendPrescriptionEmail } from '../services/email.service'
import { createNotification } from '../services/notification.service'

const router = Router()

// POST /api/prescriptions — create prescription (doctor only)
router.post(
  '/',
  requireAuth,
  requireRole('doctor'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { appointmentId, diagnosis, medications, notes } = req.body

      if (!appointmentId || !diagnosis || !medications) {
        res.status(400).json({ error: 'appointmentId, diagnosis, and medications are required' })
        return
      }

      if (!Array.isArray(medications) || medications.length === 0) {
        res.status(400).json({ error: 'medications must be a non-empty array' })
        return
      }

      const doctor = await getDoctorByUserId(req.user!.userId)
      if (!doctor) {
        res.status(404).json({ error: 'Doctor profile not found' })
        return
      }

      // Verify appointment exists and belongs to this doctor
      const [appointment] = await db
        .select()
        .from(appointments)
        .where(and(eq(appointments.id, appointmentId), eq(appointments.doctorId, doctor.id)))

      if (!appointment) {
        res.status(404).json({ error: 'Appointment not found' })
        return
      }

      const [prescription] = await db
        .insert(prescriptions)
        .values({
          appointmentId,
          doctorId: doctor.id,
          patientId: appointment.patientId,
          diagnosis,
          medications,
          notes,
        })
        .returning()

      // Get patient info for email and notification
      const [patient] = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, appointment.patientId))

      // Get doctor's name
      const [doctorUser] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, req.user!.userId))

      if (patient && doctorUser) {
        // Send prescription email to patient
        try {
          await sendPrescriptionEmail({
            patientEmail: patient.email,
            patientName: patient.name,
            doctorName: doctorUser.name,
            diagnosis,
            medications,
          })
        } catch (err) {
          console.error('Failed to send prescription email:', err)
        }

        // In-app notification for patient
        try {
          await createNotification({
            userId: appointment.patientId,
            type: 'prescription_created',
            title: 'New Prescription',
            message: `Dr. ${doctorUser.name} has uploaded a prescription for your consultation.`,
            metadata: { prescriptionId: prescription!.id, appointmentId },
          })
        } catch (err) {
          console.error('Failed to create prescription notification:', err)
        }
      }

      res.status(201).json({ prescription })
    } catch (error) {
      res.status(500).json({ error: 'Failed to create prescription' })
    }
  },
)

// GET /api/prescriptions/appointment/:appointmentId — get prescription for appointment
router.get(
  '/appointment/:appointmentId',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const appointmentId = Number(req.params.appointmentId)

      const [prescription] = await db
        .select({
          id: prescriptions.id,
          diagnosis: prescriptions.diagnosis,
          medications: prescriptions.medications,
          notes: prescriptions.notes,
          createdAt: prescriptions.createdAt,
          doctorName: users.name,
          doctorSpecialization: doctors.specialization,
        })
        .from(prescriptions)
        .innerJoin(doctors, eq(prescriptions.doctorId, doctors.id))
        .innerJoin(users, eq(doctors.userId, users.id))
        .where(eq(prescriptions.appointmentId, appointmentId))

      if (!prescription) {
        res.status(404).json({ error: 'Prescription not found' })
        return
      }

      res.json({ prescription })
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch prescription' })
    }
  },
)

// GET /api/prescriptions/my — patient's prescriptions
router.get(
  '/my',
  requireAuth,
  requireRole('patient'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await db
        .select({
          id: prescriptions.id,
          diagnosis: prescriptions.diagnosis,
          medications: prescriptions.medications,
          notes: prescriptions.notes,
          createdAt: prescriptions.createdAt,
          appointmentId: prescriptions.appointmentId,
          doctorName: users.name,
          doctorSpecialization: doctors.specialization,
        })
        .from(prescriptions)
        .innerJoin(doctors, eq(prescriptions.doctorId, doctors.id))
        .innerJoin(users, eq(doctors.userId, users.id))
        .where(eq(prescriptions.patientId, req.user!.userId))
        .orderBy(desc(prescriptions.createdAt))

      res.json({ prescriptions: result })
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch prescriptions' })
    }
  },
)

// GET /api/prescriptions/patient/:patientId — doctor views a patient's past prescriptions
router.get(
  '/patient/:patientId',
  requireAuth,
  requireRole('doctor'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const patientId = Number(req.params.patientId)

      const result = await db
        .select({
          id: prescriptions.id,
          diagnosis: prescriptions.diagnosis,
          medications: prescriptions.medications,
          notes: prescriptions.notes,
          createdAt: prescriptions.createdAt,
          appointmentId: prescriptions.appointmentId,
          doctorName: users.name,
          doctorSpecialization: doctors.specialization,
        })
        .from(prescriptions)
        .innerJoin(doctors, eq(prescriptions.doctorId, doctors.id))
        .innerJoin(users, eq(doctors.userId, users.id))
        .where(eq(prescriptions.patientId, patientId))
        .orderBy(desc(prescriptions.createdAt))

      res.json({ prescriptions: result })
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch patient prescriptions' })
    }
  },
)

export default router
