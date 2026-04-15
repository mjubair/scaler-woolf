import { Router, type Request, type Response } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import { getDoctorByUserId } from '../services/doctor.service'
import { getAuthUrl, handleOAuthCallback, saveDoctorRefreshToken } from '../services/calendar.service'

const router = Router()

// GET /api/calendar/auth-url — get Google OAuth consent URL (doctor only)
router.get(
  '/auth-url',
  requireAuth,
  requireRole('doctor'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const doctor = await getDoctorByUserId(req.user!.userId)
      if (!doctor) {
        res.status(404).json({ error: 'Doctor profile not found' })
        return
      }
      const url = getAuthUrl(doctor.id)
      res.json({ url })
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate auth URL' })
    }
  },
)

// GET /api/calendar/callback — OAuth callback, store refresh token
router.get('/callback', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = req.query.code as string
    const state = req.query.state as string // doctorId passed through state

    if (!code) {
      res.status(400).json({ error: 'Authorization code is required' })
      return
    }

    const tokens = await handleOAuthCallback(code)

    if (tokens.refresh_token && state) {
      const doctorId = Number(state)
      await saveDoctorRefreshToken(doctorId, tokens.refresh_token)
    }

    // Redirect back to the frontend calendar settings page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    res.redirect(`${frontendUrl}/dashboard/doctor/calendar?connected=true`)
  } catch (error) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    res.redirect(`${frontendUrl}/dashboard/doctor/calendar?error=true`)
  }
})

// GET /api/calendar/status — check if doctor has connected Google Calendar
router.get(
  '/status',
  requireAuth,
  requireRole('doctor'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const doctor = await getDoctorByUserId(req.user!.userId)
      if (!doctor) {
        res.status(404).json({ error: 'Doctor profile not found' })
        return
      }

      res.json({ connected: !!doctor.googleRefreshToken })
    } catch (error) {
      res.status(500).json({ error: 'Failed to check calendar status' })
    }
  },
)

export default router
