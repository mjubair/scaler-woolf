import { Router, type Request, type Response } from 'express'
import { eq, sql, desc, and } from 'drizzle-orm'
import { db } from '../db'
import { users, doctors, appointments, payments, reviews } from '../db/schema'
import { requireAuth, requireRole } from '../middleware/auth'
import { sendDoctorApprovalEmail } from '../services/email.service'
import { createNotification } from '../services/notification.service'

const router = Router()

// All admin routes require admin role
router.use(requireAuth, requireRole('admin'))

// GET /api/admin/dashboard — analytics overview
router.get('/dashboard', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [totalDoctors] = await db
      .select({ count: sql<number>`count(*)` })
      .from(doctors)

    const [approvedDoctors] = await db
      .select({ count: sql<number>`count(*)` })
      .from(doctors)
      .where(eq(doctors.isApproved, true))

    const [pendingDoctors] = await db
      .select({ count: sql<number>`count(*)` })
      .from(doctors)
      .where(eq(doctors.isApproved, false))

    const [totalPatients] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, 'patient'))

    const [totalAppointments] = await db
      .select({ count: sql<number>`count(*)` })
      .from(appointments)

    const [completedAppointments] = await db
      .select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(eq(appointments.status, 'completed'))

    const [totalRevenue] = await db
      .select({ total: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
      .from(payments)
      .where(eq(payments.status, 'paid'))

    const recentAppointments = await db
      .select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        status: appointments.status,
        patientName: sql<string>`patient.name`,
        doctorName: sql<string>`doctor_user.name`,
      })
      .from(appointments)
      .innerJoin(sql`users as patient`, sql`patient.id = ${appointments.patientId}`)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .innerJoin(sql`users as doctor_user`, sql`doctor_user.id = ${doctors.userId}`)
      .orderBy(desc(appointments.createdAt))
      .limit(10)

    res.json({
      stats: {
        totalDoctors: Number(totalDoctors?.count || 0),
        approvedDoctors: Number(approvedDoctors?.count || 0),
        pendingDoctors: Number(pendingDoctors?.count || 0),
        totalPatients: Number(totalPatients?.count || 0),
        totalAppointments: Number(totalAppointments?.count || 0),
        completedAppointments: Number(completedAppointments?.count || 0),
        totalRevenue: totalRevenue?.total || '0',
      },
      recentAppointments,
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' })
  }
})

// GET /api/admin/doctors — list all doctors
router.get('/doctors', async (req: Request, res: Response): Promise<void> => {
  try {
    const approved = req.query.approved

    const conditions = []
    if (approved === 'true') conditions.push(eq(doctors.isApproved, true))
    if (approved === 'false') conditions.push(eq(doctors.isApproved, false))

    const result = await db
      .select({
        id: doctors.id,
        userId: doctors.userId,
        specialization: doctors.specialization,
        qualification: doctors.qualification,
        experience: doctors.experience,
        consultationFee: doctors.consultationFee,
        isApproved: doctors.isApproved,
        avgRating: doctors.avgRating,
        totalReviews: doctors.totalReviews,
        createdAt: doctors.createdAt,
        userName: users.name,
        userEmail: users.email,
        userPhone: users.phone,
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(doctors.createdAt))

    res.json({ doctors: result })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch doctors' })
  }
})

// PATCH /api/admin/doctors/:id/approve — approve a doctor
router.patch('/doctors/:id/approve', async (req: Request, res: Response): Promise<void> => {
  try {
    const doctorId = Number(req.params.id)

    const [updated] = await db
      .update(doctors)
      .set({ isApproved: true, updatedAt: new Date() })
      .where(eq(doctors.id, doctorId))
      .returning()

    if (!updated) {
      res.status(404).json({ error: 'Doctor not found' })
      return
    }

    // Get doctor's user info for email
    const [doctorUser] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, updated.userId))

    if (doctorUser) {
      await sendDoctorApprovalEmail({
        doctorEmail: doctorUser.email,
        doctorName: doctorUser.name,
      })

      await createNotification({
        userId: updated.userId,
        type: 'doctor_approved',
        title: 'Profile Approved',
        message: 'Your doctor profile has been approved. You can now receive appointment bookings.',
        metadata: { doctorId },
      })
    }

    res.json({ doctor: updated })
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve doctor' })
  }
})

// PATCH /api/admin/doctors/:id/reject — reject a doctor
router.patch('/doctors/:id/reject', async (req: Request, res: Response): Promise<void> => {
  try {
    const doctorId = Number(req.params.id)
    const { reason } = req.body

    const [updated] = await db
      .update(doctors)
      .set({ isApproved: false, updatedAt: new Date() })
      .where(eq(doctors.id, doctorId))
      .returning()

    if (!updated) {
      res.status(404).json({ error: 'Doctor not found' })
      return
    }

    await createNotification({
      userId: updated.userId,
      type: 'doctor_rejected',
      title: 'Profile Not Approved',
      message: reason || 'Your doctor profile was not approved. Please update your details and try again.',
      metadata: { doctorId },
    })

    res.json({ doctor: updated })
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject doctor' })
  }
})

// GET /api/admin/patients — list all patients
router.get('/patients', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.role, 'patient'))
      .orderBy(desc(users.createdAt))

    res.json({ patients: result })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patients' })
  }
})

// GET /api/admin/appointments — list all appointments
router.get('/appointments', async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string | undefined

    const conditions = []
    if (status) conditions.push(sql`${appointments.status} = ${status}`)

    const result = await db
      .select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        status: appointments.status,
        reason: appointments.reason,
        googleMeetLink: appointments.googleMeetLink,
        createdAt: appointments.createdAt,
        patientName: sql<string>`patient.name`,
        patientEmail: sql<string>`patient.email`,
        doctorName: sql<string>`doctor_user.name`,
        doctorSpecialization: doctors.specialization,
      })
      .from(appointments)
      .innerJoin(sql`users as patient`, sql`patient.id = ${appointments.patientId}`)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .innerJoin(sql`users as doctor_user`, sql`doctor_user.id = ${doctors.userId}`)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(appointments.createdAt))

    res.json({ appointments: result })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointments' })
  }
})

export default router
