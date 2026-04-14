import { eq, and, desc } from 'drizzle-orm'
import { db } from '../db'
import { notifications } from '../db/schema'

export async function createNotification(params: {
  userId: number
  type: string
  title: string
  message: string
  metadata?: Record<string, unknown>
}) {
  const [notification] = await db
    .insert(notifications)
    .values({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      metadata: params.metadata || null,
    })
    .returning()

  return notification
}

export async function getUserNotifications(userId: number, limit = 20) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
}

export async function markAsRead(notificationId: number, userId: number) {
  const [updated] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning()

  return updated || null
}

export async function markAllAsRead(userId: number) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
}

export async function getUnreadCount(userId: number) {
  const result = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))

  return result.length
}
