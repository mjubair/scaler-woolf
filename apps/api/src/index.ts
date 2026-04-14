import 'dotenv/config'
import express, { type Request, type Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { db } from './db'
import { users } from './db/schema'
import authRouter from './routes/auth'
import doctorsRouter from './routes/doctors'
import appointmentsRouter from './routes/appointments'
import paymentsRouter from './routes/payments'
import calendarRouter from './routes/calendar'
import reviewsRouter from './routes/reviews'
import prescriptionsRouter from './routes/prescriptions'
import patientsRouter from './routes/patients'
import notificationsRouter from './routes/notifications'
import adminRouter from './routes/admin'

const app = express()
const PORT = process.env.PORT || 3001
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000']

// Security middleware
app.use(helmet())
app.use(cors({ origin: allowedOrigins }))
app.use(express.json())

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
})

app.use(globalLimiter)
app.use('/api/auth', authLimiter)

// Routes
app.use('/api/auth', authRouter)
app.use('/api/doctors', doctorsRouter)
app.use('/api/appointments', appointmentsRouter)
app.use('/api/payments', paymentsRouter)
app.use('/api/calendar', calendarRouter)
app.use('/api/reviews', reviewsRouter)
app.use('/api/prescriptions', prescriptionsRouter)
app.use('/api/patients', patientsRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/admin', adminRouter)

// Root
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'DocBook API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

// Health check
app.get('/health', async (_req: Request, res: Response) => {
  let dbStatus = 'disconnected'
  let dbError = null

  try {
    await db.select().from(users).limit(1)
    dbStatus = 'connected'
  } catch (error) {
    dbError = error instanceof Error ? error.message : 'Unknown error'
  }

  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      error: dbError,
    },
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
})
