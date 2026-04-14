import { Router, type Router as RouterType, type Request, type Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { users, doctors } from '../db/schema'
import { requireAuth } from '../middleware/auth'

const router: RouterType = Router()

const SALT_ROUNDS = 12
const TOKEN_EXPIRY = '7d'

function signToken(userId: number, email: string, role: string): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET not set')
  return jwt.sign({ userId, email, role }, secret, { expiresIn: TOKEN_EXPIRY })
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role, phone } = req.body

  if (!name || !email || !password) {
    res.status(400).json({ error: 'name, email, and password are required' })
    return
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' })
    return
  }

  const validRoles = ['patient', 'doctor']
  const userRole = validRoles.includes(role) ? role : 'patient'

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email))
  if (existing.length > 0) {
    res.status(409).json({ error: 'Email already registered' })
    return
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash, role: userRole, phone })
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      phone: users.phone,
      createdAt: users.createdAt,
    })

  // If registering as a doctor, create a doctor profile stub
  if (userRole === 'doctor') {
    await db.insert(doctors).values({
      userId: user!.id,
      specialization: '',
      qualification: '',
      consultationFee: '0',
    })
  }

  const token = signToken(user!.id, user!.email, user!.role)
  res.status(201).json({ token, user })
})

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' })
    return
  }

  const [user] = await db.select().from(users).where(eq(users.email, email))
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }

  if (!user.isActive) {
    res.status(403).json({ error: 'Your account has been deactivated' })
    return
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }

  const token = signToken(user.id, user.email, user.role)
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar,
      createdAt: user.createdAt,
    },
  })
})

// GET /api/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      phone: users.phone,
      avatar: users.avatar,
      isActive: users.isActive,
      isVerified: users.isVerified,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, req.user!.userId))

  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  res.json({ user })
})

export default router
