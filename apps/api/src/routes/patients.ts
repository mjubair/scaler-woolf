import { Router, type Request, type Response } from 'express'
import { eq, and, desc } from 'drizzle-orm'
import { db } from '../db'
import { medicalHistory, users, appointments, doctors } from '../db/schema'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()

// GET /api/patients/profile — get own profile
router.get('/profile', requireAuth, requireRole('patient'), async (req: Request, res: Response): Promise<void> => {
  try {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        avatar: users.avatar,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, req.user!.userId))

    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    res.json({ user })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

// PUT /api/patients/profile — update own profile
router.put('/profile', requireAuth, requireRole('patient'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, avatar } = req.body

    const [updated] = await db
      .update(users)
      .set({
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(avatar !== undefined && { avatar }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.user!.userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        avatar: users.avatar,
      })

    res.json({ user: updated })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

// ── Medical History ────────────────────────────────────────────────────────

// GET /api/patients/medical-history
router.get(
  '/medical-history',
  requireAuth,
  requireRole('patient'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const history = await db
        .select()
        .from(medicalHistory)
        .where(eq(medicalHistory.patientId, req.user!.userId))
        .orderBy(desc(medicalHistory.createdAt))

      res.json({ medicalHistory: history })
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch medical history' })
    }
  },
)

// POST /api/patients/medical-history
router.post(
  '/medical-history',
  requireAuth,
  requireRole('patient'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { condition, description, diagnosedDate, isOngoing } = req.body

      if (!condition) {
        res.status(400).json({ error: 'condition is required' })
        return
      }

      const [entry] = await db
        .insert(medicalHistory)
        .values({
          patientId: req.user!.userId,
          condition,
          description,
          diagnosedDate,
          isOngoing: isOngoing ?? false,
        })
        .returning()

      res.status(201).json({ entry })
    } catch (error) {
      res.status(500).json({ error: 'Failed to add medical history' })
    }
  },
)

// PUT /api/patients/medical-history/:id
router.put(
  '/medical-history/:id',
  requireAuth,
  requireRole('patient'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const entryId = Number(req.params.id)
      const { condition, description, diagnosedDate, isOngoing } = req.body

      const [updated] = await db
        .update(medicalHistory)
        .set({
          ...(condition && { condition }),
          ...(description !== undefined && { description }),
          ...(diagnosedDate !== undefined && { diagnosedDate }),
          ...(isOngoing !== undefined && { isOngoing }),
          updatedAt: new Date(),
        })
        .where(and(eq(medicalHistory.id, entryId), eq(medicalHistory.patientId, req.user!.userId)))
        .returning()

      if (!updated) {
        res.status(404).json({ error: 'Medical history entry not found' })
        return
      }

      res.json({ entry: updated })
    } catch (error) {
      res.status(500).json({ error: 'Failed to update medical history' })
    }
  },
)

// DELETE /api/patients/medical-history/:id
router.delete(
  '/medical-history/:id',
  requireAuth,
  requireRole('patient'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const entryId = Number(req.params.id)

      const [deleted] = await db
        .delete(medicalHistory)
        .where(and(eq(medicalHistory.id, entryId), eq(medicalHistory.patientId, req.user!.userId)))
        .returning()

      if (!deleted) {
        res.status(404).json({ error: 'Medical history entry not found' })
        return
      }

      res.json({ message: 'Medical history entry deleted' })
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete medical history' })
    }
  },
)

// ── Doctor-facing: View patient medical history ────────────────────────────
// GET /api/patients/:patientId/medical-history (doctor only, must have appointment with patient)
router.get(
  '/:patientId/medical-history',
  requireAuth,
  requireRole('doctor'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const patientId = Number(req.params.patientId)

      // Verify doctor has an appointment with this patient
      const [doctor] = await db
        .select({ id: doctors.id })
        .from(doctors)
        .where(eq(doctors.userId, req.user!.userId))

      if (!doctor) {
        res.status(404).json({ error: 'Doctor profile not found' })
        return
      }

      const [hasAppointment] = await db
        .select({ id: appointments.id })
        .from(appointments)
        .where(and(eq(appointments.doctorId, doctor.id), eq(appointments.patientId, patientId)))
        .limit(1)

      if (!hasAppointment) {
        res.status(403).json({ error: 'You can only view medical history for your own patients' })
        return
      }

      const history = await db
        .select()
        .from(medicalHistory)
        .where(eq(medicalHistory.patientId, patientId))
        .orderBy(desc(medicalHistory.createdAt))

      res.json({ medicalHistory: history })
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch medical history' })
    }
  },
)

export default router
