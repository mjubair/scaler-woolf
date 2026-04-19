import { Router, type Request, type Response } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import {
  listDoctors,
  getDoctorById,
  getDoctorByUserId,
  updateDoctorProfile,
  getDoctorSlots,
  createSlots,
  deleteSlot,
  getAvailableSlotsForDate,
} from '../services/doctor.service'

const router = Router()

// GET /api/doctors — public doctor listing with search/filter
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await listDoctors({
      specialization: req.query.specialization as string,
      search: req.query.search as string,
      gender: req.query.gender as string,
      minRating: req.query.minRating ? Number(req.query.minRating) : undefined,
      minFee: req.query.minFee ? Number(req.query.minFee) : undefined,
      maxFee: req.query.maxFee ? Number(req.query.maxFee) : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 10,
      sortBy: req.query.sortBy as 'rating' | 'experience' | 'fee',
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch doctors' })
  }
})

// GET /api/doctors/me/profile — doctor's own profile
router.get(
  '/me/profile',
  requireAuth,
  requireRole('doctor'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const doctor = await getDoctorByUserId(req.user!.userId)
      if (!doctor) {
        res.status(404).json({ error: 'Doctor profile not found' })
        return
      }
      res.json({ doctor })
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch profile' })
    }
  },
)

// PUT /api/doctors/me/profile — update own profile
router.put(
  '/me/profile',
  requireAuth,
  requireRole('doctor'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { specialization, qualification, experience, consultationFee, bio, hospitalName, address } = req.body
      const updated = await updateDoctorProfile(req.user!.userId, {
        specialization,
        qualification,
        experience,
        consultationFee,
        bio,
        hospitalName,
        address,
      })

      if (!updated) {
        res.status(404).json({ error: 'Doctor profile not found' })
        return
      }

      res.json({ doctor: updated })
    } catch (error) {
      res.status(500).json({ error: 'Failed to update profile' })
    }
  },
)

// GET /api/doctors/me/slots — get own availability slots
router.get(
  '/me/slots',
  requireAuth,
  requireRole('doctor'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const doctor = await getDoctorByUserId(req.user!.userId)
      if (!doctor) {
        res.status(404).json({ error: 'Doctor profile not found' })
        return
      }
      const slots = await getDoctorSlots(doctor.id)
      res.json({ slots })
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch slots' })
    }
  },
)

// POST /api/doctors/me/slots — create availability slots
router.post(
  '/me/slots',
  requireAuth,
  requireRole('doctor'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { slots } = req.body

      if (!Array.isArray(slots) || slots.length === 0) {
        res.status(400).json({ error: 'slots array is required' })
        return
      }

      for (const slot of slots) {
        if (slot.dayOfWeek === undefined || !slot.startTime || !slot.endTime) {
          res.status(400).json({ error: 'Each slot must have dayOfWeek, startTime, and endTime' })
          return
        }
        if (slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
          res.status(400).json({ error: 'dayOfWeek must be between 0 (Sunday) and 6 (Saturday)' })
          return
        }
      }

      const doctor = await getDoctorByUserId(req.user!.userId)
      if (!doctor) {
        res.status(404).json({ error: 'Doctor profile not found' })
        return
      }

      const created = await createSlots(doctor.id, slots)
      res.status(201).json({ slots: created })
    } catch (error) {
      res.status(500).json({ error: 'Failed to create slots' })
    }
  },
)

// DELETE /api/doctors/me/slots/:id — remove a slot
router.delete(
  '/me/slots/:id',
  requireAuth,
  requireRole('doctor'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const slotId = Number(req.params.id)
      const doctor = await getDoctorByUserId(req.user!.userId)
      if (!doctor) {
        res.status(404).json({ error: 'Doctor profile not found' })
        return
      }

      const deleted = await deleteSlot(slotId, doctor.id)
      if (!deleted) {
        res.status(404).json({ error: 'Slot not found' })
        return
      }

      res.json({ message: 'Slot deleted successfully' })
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete slot' })
    }
  },
)

// GET /api/doctors/:id — public doctor profile
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const doctorId = Number(req.params.id)
    const doctor = await getDoctorById(doctorId)

    if (!doctor) {
      res.status(404).json({ error: 'Doctor not found' })
      return
    }

    res.json({ doctor })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch doctor' })
  }
})

// GET /api/doctors/:id/slots — get available slots for a specific date
router.get('/:id/slots', async (req: Request, res: Response): Promise<void> => {
  try {
    const doctorId = Number(req.params.id)
    const date = req.query.date as string

    if (!date) {
      res.status(400).json({ error: 'date query parameter is required (YYYY-MM-DD)' })
      return
    }

    const slots = await getAvailableSlotsForDate(doctorId, date)
    res.json({ slots })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch available slots' })
  }
})

export default router
