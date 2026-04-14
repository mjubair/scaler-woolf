import { Router, type Request, type Response } from 'express'
import { eq, and, desc, sql } from 'drizzle-orm'
import { db } from '../db'
import { reviews, appointments, doctors, users } from '../db/schema'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()

// POST /api/reviews — create a review (patient only, appointment must be completed)
router.post(
  '/',
  requireAuth,
  requireRole('patient'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { appointmentId, rating, comment } = req.body

      if (!appointmentId || !rating) {
        res.status(400).json({ error: 'appointmentId and rating are required' })
        return
      }

      if (rating < 1 || rating > 5) {
        res.status(400).json({ error: 'Rating must be between 1 and 5' })
        return
      }

      // Verify appointment exists, belongs to this patient, and is completed
      const [appointment] = await db
        .select()
        .from(appointments)
        .where(
          and(eq(appointments.id, appointmentId), eq(appointments.patientId, req.user!.userId)),
        )

      if (!appointment) {
        res.status(404).json({ error: 'Appointment not found' })
        return
      }

      if (appointment.status !== 'completed') {
        res.status(400).json({ error: 'You can only review completed appointments' })
        return
      }

      // Check if already reviewed
      const [existingReview] = await db
        .select({ id: reviews.id })
        .from(reviews)
        .where(eq(reviews.appointmentId, appointmentId))

      if (existingReview) {
        res.status(409).json({ error: 'You have already reviewed this appointment' })
        return
      }

      const [review] = await db
        .insert(reviews)
        .values({
          appointmentId,
          patientId: req.user!.userId,
          doctorId: appointment.doctorId,
          rating,
          comment,
        })
        .returning()

      // Update doctor's average rating and total reviews
      const [stats] = await db
        .select({
          avgRating: sql<string>`ROUND(AVG(${reviews.rating}), 2)`,
          totalReviews: sql<number>`COUNT(*)`,
        })
        .from(reviews)
        .where(eq(reviews.doctorId, appointment.doctorId))

      await db
        .update(doctors)
        .set({
          avgRating: stats!.avgRating,
          totalReviews: Number(stats!.totalReviews),
          updatedAt: new Date(),
        })
        .where(eq(doctors.id, appointment.doctorId))

      res.status(201).json({ review })
    } catch (error) {
      res.status(500).json({ error: 'Failed to create review' })
    }
  },
)

// GET /api/reviews/doctor/:doctorId — list reviews for a doctor (public)
router.get('/doctor/:doctorId', async (req: Request, res: Response): Promise<void> => {
  try {
    const doctorId = Number(req.params.doctorId)
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 10
    const offset = (page - 1) * limit

    const result = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        patientName: users.name,
        patientAvatar: users.avatar,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.patientId, users.id))
      .where(eq(reviews.doctorId, doctorId))
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset)

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(reviews)
      .where(eq(reviews.doctorId, doctorId))

    res.json({
      reviews: result,
      pagination: {
        page,
        limit,
        total: Number(countResult?.count || 0),
        totalPages: Math.ceil(Number(countResult?.count || 0) / limit),
      },
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews' })
  }
})

// GET /api/reviews/my — my reviews (patient)
router.get(
  '/my',
  requireAuth,
  requireRole('patient'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          comment: reviews.comment,
          createdAt: reviews.createdAt,
          doctorId: reviews.doctorId,
          doctorName: users.name,
          doctorSpecialization: doctors.specialization,
        })
        .from(reviews)
        .innerJoin(doctors, eq(reviews.doctorId, doctors.id))
        .innerJoin(users, eq(doctors.userId, users.id))
        .where(eq(reviews.patientId, req.user!.userId))
        .orderBy(desc(reviews.createdAt))

      res.json({ reviews: result })
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch reviews' })
    }
  },
)

export default router
