import { Router, type Request, type Response } from 'express'
import { eq, and, desc } from 'drizzle-orm'
import { db } from '../db'
import { prescriptions, appointments, doctors, users } from '../db/schema'
import { requireAuth, requireRole } from '../middleware/auth'
import { getDoctorByUserId } from '../services/doctor.service'

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

export default router
