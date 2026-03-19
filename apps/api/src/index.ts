import 'dotenv/config'
import express, { type Request, type Response } from 'express'
import cors from 'cors'
import { db } from './db'
import { users } from './db/schema'
import authRouter from './routes/auth'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Auth routes
app.use('/api/auth', authRouter)

// Routes
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Welcome to Woolf API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

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

app.get('/api/hello', (_req: Request, res: Response) => {
  res.json({
    message: 'Hello from Woolf API!',
    data: {
      greeting: 'Welcome to the monorepo',
      framework: 'Express.js',
      typescript: true,
    },
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
})
