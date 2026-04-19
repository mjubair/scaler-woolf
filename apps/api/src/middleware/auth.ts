import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthPayload {
  userId: number
  email: string
  role: 'patient' | 'doctor' | 'admin'
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' })
    return
  }

  const token = authHeader.slice(7)
  const secret = process.env.JWT_SECRET

  if (!secret) {
    res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET not set' })
    return
  }

  try {
    const payload = jwt.verify(token, secret) as AuthPayload
    req.user = payload
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireRole(...roles: Array<'patient' | 'doctor' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'You do not have permission to access this resource' })
      return
    }

    next()
  }
}
