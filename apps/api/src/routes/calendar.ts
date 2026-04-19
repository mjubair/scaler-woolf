import { Router, type Request, type Response } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import { getAuthUrl, handleOAuthCallback } from '../services/calendar.service'

const router = Router()

// GET /api/calendar/auth-url — get Google OAuth consent URL (admin only)
router.get(
  '/auth-url',
  requireAuth,
  requireRole('admin'),
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const url = getAuthUrl()
      res.json({ url })
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate auth URL' })
    }
  },
)

// GET /api/calendar/callback — OAuth callback, log the refresh token
router.get('/callback', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = req.query.code as string

    if (!code) {
      res.status(400).json({ error: 'Authorization code is required' })
      return
    }

    const tokens = await handleOAuthCallback(code)

    if (tokens.refresh_token) {
      // Log it so admin can add to .env
      console.log('\n=== GOOGLE REFRESH TOKEN ===')
      console.log('Add this to your .env file:')
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`)
      console.log('============================\n')
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    res.redirect(`${frontendUrl}?calendar_connected=true`)
  } catch (error) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    res.redirect(`${frontendUrl}?calendar_error=true`)
  }
})

// GET /api/calendar/status — check if app-level calendar is configured
router.get(
  '/status',
  requireAuth,
  async (_req: Request, res: Response): Promise<void> => {
    res.json({ connected: !!process.env.GOOGLE_REFRESH_TOKEN })
  },
)

export default router
