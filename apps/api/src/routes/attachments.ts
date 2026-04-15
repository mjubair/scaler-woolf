import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import { eq, and, desc, sql } from 'drizzle-orm'
import { db } from '../db'
import { appointmentAttachments, appointments, doctors } from '../db/schema'
import { requireAuth, requireRole } from '../middleware/auth'
import { uploadFile, deleteFile } from '../services/upload.service'

const router = Router()

// Multer config: memory storage, 10MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('File type not allowed. Accepted: JPEG, PNG, PDF, DOC, DOCX'))
    }
  },
})

// POST /api/attachments/upload — patient uploads file for an appointment
router.post(
  '/upload',
  requireAuth,
  requireRole('patient'),
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { appointmentId } = req.body
      const file = req.file

      if (!file) {
        res.status(400).json({ error: 'File is required' })
        return
      }

      if (!appointmentId) {
        res.status(400).json({ error: 'appointmentId is required' })
        return
      }

      // Verify appointment belongs to this patient and is not cancelled/completed
      const [appointment] = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.id, Number(appointmentId)),
            eq(appointments.patientId, req.user!.userId),
          ),
        )

      if (!appointment) {
        res.status(404).json({ error: 'Appointment not found' })
        return
      }

      if (appointment.status === 'cancelled' || appointment.status === 'completed') {
        res.status(400).json({ error: 'Cannot upload files for cancelled or completed appointments' })
        return
      }

      // Check max 5 files per appointment
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(appointmentAttachments)
        .where(eq(appointmentAttachments.appointmentId, Number(appointmentId)))

      if (Number(countResult?.count || 0) >= 5) {
        res.status(400).json({ error: 'Maximum 5 files per appointment' })
        return
      }

      // Upload to Cloudinary
      const { url, publicId } = await uploadFile(file.buffer, {
        folder: `docbook/appointments/${appointmentId}`,
        fileName: file.originalname,
      })

      // Save metadata to DB
      const [attachment] = await db
        .insert(appointmentAttachments)
        .values({
          appointmentId: Number(appointmentId),
          patientId: req.user!.userId,
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          cloudinaryUrl: url,
          cloudinaryId: publicId,
        })
        .returning()

      res.status(201).json({ attachment })
    } catch (error: any) {
      if (error.message?.includes('File type not allowed')) {
        res.status(400).json({ error: error.message })
        return
      }
      res.status(500).json({ error: 'Failed to upload file' })
    }
  },
)

// GET /api/attachments/appointment/:appointmentId — list attachments
router.get(
  '/appointment/:appointmentId',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const appointmentId = Number(req.params.appointmentId)

      // Verify access: patient owns it or doctor is assigned to it
      const [appointment] = await db
        .select({
          patientId: appointments.patientId,
          doctorId: appointments.doctorId,
        })
        .from(appointments)
        .where(eq(appointments.id, appointmentId))

      if (!appointment) {
        res.status(404).json({ error: 'Appointment not found' })
        return
      }

      // Check access
      if (req.user!.role === 'patient' && appointment.patientId !== req.user!.userId) {
        res.status(403).json({ error: 'Access denied' })
        return
      }

      if (req.user!.role === 'doctor') {
        const [doctor] = await db
          .select({ id: doctors.id })
          .from(doctors)
          .where(eq(doctors.userId, req.user!.userId))

        if (!doctor || appointment.doctorId !== doctor.id) {
          res.status(403).json({ error: 'Access denied' })
          return
        }
      }

      const attachments = await db
        .select()
        .from(appointmentAttachments)
        .where(eq(appointmentAttachments.appointmentId, appointmentId))
        .orderBy(desc(appointmentAttachments.createdAt))

      res.json({ attachments })
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch attachments' })
    }
  },
)

// DELETE /api/attachments/:id — patient deletes own attachment
router.delete(
  '/:id',
  requireAuth,
  requireRole('patient'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const attachmentId = Number(req.params.id)

      const [attachment] = await db
        .select()
        .from(appointmentAttachments)
        .where(
          and(
            eq(appointmentAttachments.id, attachmentId),
            eq(appointmentAttachments.patientId, req.user!.userId),
          ),
        )

      if (!attachment) {
        res.status(404).json({ error: 'Attachment not found' })
        return
      }

      // Check appointment is not completed
      const [appointment] = await db
        .select({ status: appointments.status })
        .from(appointments)
        .where(eq(appointments.id, attachment.appointmentId))

      if (appointment?.status === 'completed') {
        res.status(400).json({ error: 'Cannot delete attachments for completed appointments' })
        return
      }

      // Delete from Cloudinary
      await deleteFile(attachment.cloudinaryId)

      // Delete from DB
      await db
        .delete(appointmentAttachments)
        .where(eq(appointmentAttachments.id, attachmentId))

      res.json({ message: 'Attachment deleted' })
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete attachment' })
    }
  },
)

export default router
