import { Router, type Request, type Response } from 'express'
import { requireAuth } from '../middleware/auth'
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from '../services/notification.service'

const router = Router()

// GET /api/notifications — list user's notifications
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Number(req.query.limit) || 20
    const notificationsList = await getUserNotifications(req.user!.userId, limit)
    const unreadCount = await getUnreadCount(req.user!.userId)
    res.json({ notifications: notificationsList, unreadCount })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' })
  }
})

// PATCH /api/notifications/:id/read — mark as read
router.patch('/:id/read', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const notificationId = Number(req.params.id)
    const updated = await markAsRead(notificationId, req.user!.userId)
    if (!updated) {
      res.status(404).json({ error: 'Notification not found' })
      return
    }
    res.json({ notification: updated })
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' })
  }
})

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await markAllAsRead(req.user!.userId)
    res.json({ message: 'All notifications marked as read' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notifications as read' })
  }
})

export default router
