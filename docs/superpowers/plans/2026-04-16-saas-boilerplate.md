# SaaS Boilerplate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the woolf monorepo into a generic, reusable SaaS boilerplate with adapter-based integrations, Better Auth, multi-tenancy, subscriptions, and a CLI scaffolder.

**Architecture:** Fork woolf into a new repo, strip all healthcare-specific code, replace JWT auth with Better Auth (including organization plugin for multi-tenancy), build adapter packages for payments/email/storage, add subscription billing, and create a CLI scaffolder for generating new projects.

**Tech Stack:** Turborepo + pnpm, Express.js, Next.js 16 + React 19, Drizzle ORM + PostgreSQL, Better Auth, Tailwind CSS 4 + shadcn/ui, TanStack Query, Pino, Zod, Biome

**Spec:** `docs/superpowers/specs/2026-04-16-saas-boilerplate-design.md`

---

## Phase 1: Repository Setup

### Task 1: Create New Repo and Strip Healthcare Code

**Files:**
- Remove: `apps/api/src/routes/appointments.ts`, `apps/api/src/routes/doctors.ts`, `apps/api/src/routes/patients.ts`, `apps/api/src/routes/prescriptions.ts`, `apps/api/src/routes/reviews.ts`, `apps/api/src/routes/calendar.ts`, `apps/api/src/routes/attachments.ts`
- Remove: `apps/api/src/services/appointment.service.ts`, `apps/api/src/services/calendar.service.ts`, `apps/api/src/services/doctor.service.ts`
- Remove: `apps/api/src/db/seed.ts`, `apps/api/src/db/seed-more-doctors.ts`
- Remove: `apps/web/app/booking/`, `apps/web/app/doctors/`, `apps/web/app/doctors-v1/`, `apps/web/app/dashboard/admin/`, `apps/web/app/dashboard/doctor/`, `apps/web/app/dashboard/patient/`
- Remove: `apps/web/components/layout/doctor-search.tsx`, `apps/web/components/layout/auth-drawer.tsx`
- Modify: `apps/api/src/index.ts` — remove healthcare route imports/mounts
- Modify: `apps/api/src/db/schema.ts` — remove all healthcare tables
- Modify: `apps/web/app/page.tsx` — replace healthcare landing with placeholder
- Modify: `apps/web/app/layout.tsx` — update metadata from "DocBook" to generic
- Modify: Root `package.json` — rename from `woolf-monorepo` to `saas-kit`
- Modify: `render.yaml` — update service names
- Modify: `CLAUDE.md` — update documentation
- Modify: `docker-compose.yml` — rename container from `woolf-postgres` to `saas-kit-postgres`

- [ ] **Step 1: Create new repo from woolf copy**

```bash
cd /Users/livspace/Documents/Personal
cp -r woolf saas-kit
cd saas-kit
rm -rf .git
git init
```

- [ ] **Step 2: Remove all healthcare-specific API routes**

Delete these files:
- `apps/api/src/routes/appointments.ts`
- `apps/api/src/routes/doctors.ts`
- `apps/api/src/routes/patients.ts`
- `apps/api/src/routes/prescriptions.ts`
- `apps/api/src/routes/reviews.ts`
- `apps/api/src/routes/calendar.ts`
- `apps/api/src/routes/attachments.ts`

- [ ] **Step 3: Remove healthcare-specific services**

Delete these files:
- `apps/api/src/services/appointment.service.ts`
- `apps/api/src/services/calendar.service.ts`
- `apps/api/src/services/doctor.service.ts`
- `apps/api/src/db/seed.ts`
- `apps/api/src/db/seed-more-doctors.ts`

- [ ] **Step 4: Remove healthcare-specific frontend pages**

Delete these directories:
- `apps/web/app/booking/`
- `apps/web/app/doctors/`
- `apps/web/app/doctors-v1/`
- `apps/web/app/dashboard/admin/`
- `apps/web/app/dashboard/doctor/`
- `apps/web/app/dashboard/patient/`

Delete these files:
- `apps/web/components/layout/doctor-search.tsx`
- `apps/web/components/layout/auth-drawer.tsx`

- [ ] **Step 5: Strip healthcare schema from `apps/api/src/db/schema.ts`**

Replace the entire schema file with a minimal placeholder (custom tables will be added in Task 6):

```ts
import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core'

// Better Auth tables will be generated in Task 5.
// Custom tables (plan, subscription, payment, notification, file_upload) added in Task 6.

// Placeholder to keep Drizzle config happy
export const placeholder = pgTable('_placeholder', {
  id: text('id').primaryKey(),
})
```

- [ ] **Step 6: Clean up `apps/api/src/index.ts`**

Remove all healthcare route imports and mounts. Keep only: Express setup, Helmet, CORS, rate limiting, health check, and the auth route. The file should look like:

```ts
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import authRouter from './routes/auth'

const app = express()
const port = process.env.PORT || 3001

app.use(helmet())
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(globalLimiter)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

app.use('/api/auth', authRouter)

app.listen(port, () => {
  console.log(`API running on port ${port}`)
})
```

- [ ] **Step 7: Update root config files**

Update `package.json`:
```json
{
  "name": "saas-kit",
  ...
}
```

Update `docker-compose.yml`:
```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: saas-kit-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: saas
      POSTGRES_PASSWORD: saas_password
      POSTGRES_DB: saas_db
    ports:
      - '5433:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U saas -d saas_db']
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
    driver: local
```

Update `render.yaml`:
```yaml
services:
  - type: web
    name: saas-kit-api
    runtime: node
    buildCommand: NODE_ENV=development pnpm install --frozen-lockfile && pnpm --filter=api build && pnpm --filter=api db:migrate
    startCommand: node apps/api/dist/index.js
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: saas-kit-db
          property: connectionString
      - key: BETTER_AUTH_SECRET
        generateValue: true
      - key: ALLOWED_ORIGINS
        sync: false
      - key: NODE_ENV
        value: production

databases:
  - name: saas-kit-db
    plan: free
```

- [ ] **Step 8: Replace frontend landing page with placeholder**

Replace `apps/web/app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold">SaaS Kit</h1>
      <p className="mt-4 text-muted-foreground">Your SaaS boilerplate is ready.</p>
    </main>
  )
}
```

Update `apps/web/app/layout.tsx` metadata:
- Change title from "DocBook" to "SaaS Kit"
- Change description to generic SaaS description

- [ ] **Step 9: Remove healthcare dependencies from `apps/api/package.json`**

Remove these packages:
- `razorpay` (replaced by adapter)
- `nodemailer` (replaced by adapter)
- `cloudinary` (replaced by adapter)
- `googleapis` (Google Calendar — removed entirely)

Keep: `express`, `helmet`, `cors`, `express-rate-limit`, `drizzle-orm`, `postgres`, `bcrypt`, `jsonwebtoken`, `dotenv`, `tsx`, `drizzle-kit`

Note: `bcrypt` and `jsonwebtoken` will also be removed in Task 5 when Better Auth replaces them.

- [ ] **Step 10: Update `apps/api/.env.example`**

```bash
DATABASE_URL=postgresql://saas:saas_password@localhost:5433/saas_db
PORT=3001
ALLOWED_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

- [ ] **Step 11: Verify clean state**

```bash
cd saas-kit
pnpm install
pnpm type-check    # should pass with no healthcare references
pnpm lint          # should pass
docker compose up -d
pnpm dev --filter=api  # should start, health check at localhost:3001/health
```

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: strip healthcare code, create clean saas-kit base"
```

---

### Task 2: Set Up Shared Packages

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types.ts`
- Create: `packages/payments/package.json`
- Create: `packages/payments/tsconfig.json`
- Create: `packages/payments/src/index.ts`
- Create: `packages/payments/src/types.ts`
- Create: `packages/email/package.json`
- Create: `packages/email/tsconfig.json`
- Create: `packages/email/src/index.ts`
- Create: `packages/email/src/types.ts`
- Create: `packages/storage/package.json`
- Create: `packages/storage/tsconfig.json`
- Create: `packages/storage/src/index.ts`
- Create: `packages/storage/src/types.ts`

- [ ] **Step 1: Create `packages/shared`**

`packages/shared/package.json`:
```json
{
  "name": "@repo/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "type-check": "tsc --noEmit",
    "lint": "biome check ."
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "typescript": "^5.7.2"
  }
}
```

`packages/shared/tsconfig.json`:
```json
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

`packages/shared/src/types.ts`:
```ts
// Shared types used by both apps/api and apps/web

export type UserRole = 'user' | 'admin'

export type OrgRole = 'owner' | 'admin' | 'member'

export type PlanSlug = 'free' | 'pro' | 'enterprise'

export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing'

export type PaymentStatus = 'created' | 'paid' | 'failed' | 'refunded'

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'cancelled'

export interface PlanFeatures {
  [key: string]: boolean
}

export interface PlanLimits {
  maxMembers: number // -1 for unlimited
  maxStorage: string // e.g., "500MB", "10GB", "unlimited"
  [key: string]: string | number
}
```

`packages/shared/src/index.ts`:
```ts
export * from './types'
```

- [ ] **Step 2: Create `packages/payments` shell**

`packages/payments/package.json`:
```json
{
  "name": "@repo/payments",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "type-check": "tsc --noEmit",
    "lint": "biome check ."
  },
  "dependencies": {},
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "typescript": "^5.7.2"
  }
}
```

`packages/payments/tsconfig.json`:
```json
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

`packages/payments/src/types.ts`:
```ts
export interface CreateOrderParams {
  amount: number // smallest currency unit (cents/paise)
  currency: string
  metadata?: Record<string, string>
  returnUrl: string
  cancelUrl: string
}

export interface Order {
  id: string
  providerOrderId: string
  amount: number
  currency: string
  checkoutUrl: string
  status: string
}

export interface VerifyPaymentParams {
  providerOrderId: string
  providerPaymentId: string
  providerSignature: string
}

export interface PaymentResult {
  verified: boolean
  providerPaymentId: string
  amount: number
  currency: string
  status: string
}

export interface WebhookEvent {
  type: 'payment.success' | 'payment.failed' | 'subscription.created' | 'subscription.cancelled' | 'subscription.updated'
  providerEventId: string
  providerPaymentId?: string
  providerSubscriptionId?: string
  amount?: number
  currency?: string
  metadata?: Record<string, string>
  raw: unknown
}

export interface CreateSubscriptionParams {
  planId: string
  customerId?: string
  customerEmail: string
  customerName: string
  amount: number
  currency: string
  interval: 'monthly' | 'yearly'
  returnUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
}

export interface SubscriptionResult {
  providerSubscriptionId: string
  checkoutUrl: string
  status: string
}

export interface PaymentProvider {
  createOrder(params: CreateOrderParams): Promise<Order>
  verifyPayment(params: VerifyPaymentParams): Promise<PaymentResult>
  handleWebhook(payload: unknown, headers: Record<string, string>): Promise<WebhookEvent>
  createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResult>
  cancelSubscription(providerSubscriptionId: string): Promise<void>
  getPaymentStatus(providerPaymentId: string): Promise<{ status: string; amount: number; currency: string }>
}
```

`packages/payments/src/index.ts`:
```ts
export type { PaymentProvider, CreateOrderParams, Order, VerifyPaymentParams, PaymentResult, WebhookEvent, CreateSubscriptionParams, SubscriptionResult } from './types'

export function createPaymentProvider(provider: string, _config: Record<string, string>): import('./types').PaymentProvider {
  switch (provider) {
    case 'stripe':
      throw new Error('Stripe adapter not yet implemented')
    case 'razorpay':
      throw new Error('Razorpay adapter not yet implemented')
    case 'cashfree':
      throw new Error('Cashfree adapter not yet implemented')
    default:
      throw new Error(`Unknown payment provider: ${provider}`)
  }
}
```

- [ ] **Step 3: Create `packages/email` shell**

`packages/email/src/types.ts`:
```ts
export interface SendEmailParams {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
}

export interface TemplateData {
  appName: string
  appUrl: string
  [key: string]: string
}

export interface EmailProvider {
  send(params: SendEmailParams): Promise<void>
  sendBatch(emails: SendEmailParams[]): Promise<void>
}
```

`packages/email/src/index.ts`:
```ts
export type { EmailProvider, SendEmailParams, TemplateData } from './types'

export function createEmailProvider(provider: string, _config: Record<string, string>): import('./types').EmailProvider {
  switch (provider) {
    case 'smtp':
      throw new Error('SMTP adapter not yet implemented')
    case 'resend':
      throw new Error('Resend adapter not yet implemented')
    case 'ses':
      throw new Error('SES adapter not yet implemented')
    default:
      throw new Error(`Unknown email provider: ${provider}`)
  }
}
```

Same `package.json` and `tsconfig.json` pattern as payments.

- [ ] **Step 4: Create `packages/storage` shell**

`packages/storage/src/types.ts`:
```ts
export interface UploadOptions {
  fileName: string
  mimeType: string
  folder?: string
  public?: boolean
}

export interface UploadResult {
  providerId: string
  providerUrl: string
  fileName: string
  fileSize: number
  mimeType: string
}

export interface StorageProvider {
  upload(file: Buffer, options: UploadOptions): Promise<UploadResult>
  delete(providerId: string): Promise<void>
  getSignedUrl(providerId: string, expiresIn?: number): Promise<string>
}
```

`packages/storage/src/index.ts`:
```ts
export type { StorageProvider, UploadOptions, UploadResult } from './types'

export function createStorageProvider(provider: string, _config: Record<string, string>): import('./types').StorageProvider {
  switch (provider) {
    case 'cloudinary':
      throw new Error('Cloudinary adapter not yet implemented')
    case 's3':
      throw new Error('S3 adapter not yet implemented')
    case 'gcs':
      throw new Error('GCS adapter not yet implemented')
    default:
      throw new Error(`Unknown storage provider: ${provider}`)
  }
}
```

Same `package.json` and `tsconfig.json` pattern as payments.

- [ ] **Step 5: Update pnpm workspace and verify**

`pnpm-workspace.yaml` already includes `packages/*`, so new packages are auto-discovered.

```bash
pnpm install
pnpm type-check
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add shared, payments, email, storage package shells"
```

---

## Phase 2: Core Infrastructure

### Task 3: Environment Validation and Structured Logging

**Files:**
- Create: `apps/api/src/env.ts`
- Create: `apps/api/src/logger.ts`
- Modify: `apps/api/src/index.ts` — use env + logger
- Modify: `apps/api/package.json` — add pino, zod deps

- [ ] **Step 1: Install dependencies**

```bash
cd apps/api
pnpm add zod pino pino-http
pnpm add -D pino-pretty
```

- [ ] **Step 2: Create `apps/api/src/env.ts`**

```ts
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  BETTER_AUTH_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Adapter selection
  PAYMENT_PROVIDER: z.enum(['stripe', 'razorpay', 'cashfree']).default('stripe'),
  EMAIL_PROVIDER: z.enum(['smtp', 'resend', 'ses']).default('smtp'),
  STORAGE_PROVIDER: z.enum(['cloudinary', 's3', 'gcs']).default('cloudinary'),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // Razorpay
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // Cashfree
  CASHFREE_APP_ID: z.string().optional(),
  CASHFREE_SECRET_KEY: z.string().optional(),
  CASHFREE_WEBHOOK_SECRET: z.string().optional(),

  // SMTP
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),

  // Resend
  RESEND_API_KEY: z.string().optional(),

  // AWS SES
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // S3
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),

  // GCS
  GCS_BUCKET: z.string().optional(),
  GCS_PROJECT_ID: z.string().optional(),
  GCS_KEY_FILE: z.string().optional(),
})

function validateEnv() {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    console.error('Invalid environment variables:')
    for (const issue of parsed.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`)
    }
    process.exit(1)
  }
  return parsed.data
}

export const env = validateEnv()
export type Env = z.infer<typeof envSchema>
```

- [ ] **Step 3: Create `apps/api/src/logger.ts`**

```ts
import pino from 'pino'
import { env } from './env'

export const logger = pino({
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
})
```

- [ ] **Step 4: Update `apps/api/src/index.ts` to use env and logger**

```ts
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import pinoHttp from 'pino-http'
import { env } from './env'
import { logger } from './logger'

const app = express()

// Security
app.use(helmet())
app.use(cors({
  origin: env.ALLOWED_ORIGINS.split(','),
  credentials: true,
}))

// IMPORTANT: express.json() must come AFTER Better Auth handler (added in Task 4)
// Better Auth will hang if express.json() parses the body before it
app.use(express.json())

// Logging
app.use(pinoHttp({ logger }))

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(globalLimiter)

// Health check
app.get('/health', async (_req, res) => {
  try {
    // DB check will be added after Better Auth setup
    res.json({ status: 'ok', uptime: process.uptime() })
  } catch {
    res.status(503).json({ status: 'error' })
  }
})

// Graceful shutdown
const server = app.listen(env.PORT, () => {
  logger.info(`API running on port ${env.PORT}`)
})

function shutdown() {
  logger.info('Shutting down gracefully...')
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
  setTimeout(() => {
    logger.error('Forced shutdown after timeout')
    process.exit(1)
  }, 10_000)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

export { app }
```

- [ ] **Step 5: Update `apps/api/.env.example`**

```bash
DATABASE_URL=postgresql://saas:saas_password@localhost:5433/saas_db
PORT=3001
ALLOWED_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
BETTER_AUTH_SECRET=your-secret-key-at-least-32-characters-long
LOG_LEVEL=info

# Adapter selection
PAYMENT_PROVIDER=stripe
EMAIL_PROVIDER=smtp
STORAGE_PROVIDER=cloudinary

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY=

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Cashfree
CASHFREE_APP_ID=
CASHFREE_SECRET_KEY=
CASHFREE_WEBHOOK_SECRET=

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=noreply@example.com

# Resend
RESEND_API_KEY=

# AWS (SES / S3)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# S3
S3_BUCKET=
S3_REGION=

# GCS
GCS_BUCKET=
GCS_PROJECT_ID=
GCS_KEY_FILE=
```

- [ ] **Step 6: Verify**

```bash
cp apps/api/.env.example apps/api/.env
# Edit .env with valid DATABASE_URL and BETTER_AUTH_SECRET
pnpm type-check
pnpm dev --filter=api
# Verify: curl localhost:3001/health → {"status":"ok",...}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Zod env validation, Pino structured logging, graceful shutdown"
```

---

### Task 4: Better Auth Integration

**Files:**
- Create: `apps/api/src/auth.ts`
- Create: `apps/api/src/middleware/auth.ts` (rewrite)
- Modify: `apps/api/src/index.ts` — mount Better Auth handler
- Modify: `apps/api/package.json` — add better-auth dep
- Remove: `apps/api/src/routes/auth.ts` (replaced by Better Auth)
- Create: `apps/web/lib/auth-client.ts`
- Modify: `apps/web/context/auth.tsx` — rewrite with Better Auth
- Modify: `apps/web/package.json` — add better-auth dep

- [ ] **Step 1: Install Better Auth on API**

```bash
cd apps/api
pnpm add better-auth
pnpm remove bcrypt jsonwebtoken
pnpm remove -D @types/bcrypt @types/jsonwebtoken
```

- [ ] **Step 2: Create `apps/api/src/auth.ts`**

```ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization } from 'better-auth/plugins'
import { db } from './db'
import { env } from './env'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: `http://localhost:${env.PORT}`,
  basePath: '/api/auth',
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
    }),
  ],
  trustedOrigins: env.ALLOWED_ORIGINS.split(','),
})
```

- [ ] **Step 3: Generate Better Auth schema for Drizzle**

Better Auth provides a CLI to generate the Drizzle schema for its tables. Run:

```bash
cd apps/api
npx auth@latest generate --adapter drizzle --output ./src/db/auth-schema.ts --y
```

This generates `apps/api/src/db/auth-schema.ts` containing the `user`, `session`, `account`, `verification`, `organization`, `member`, and `invitation` table definitions in Drizzle format. The CLI auto-detects your auth config from common paths (`./src/`, `./lib/`, `./`).

- [ ] **Step 4: Rewrite `apps/api/src/middleware/auth.ts`**

```ts
import type { Request, Response, NextFunction } from 'express'
import { auth } from '../auth'
import { fromNodeHeaders } from 'better-auth/node'
import type { OrgRole } from '@repo/shared'

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        name: string
        role: string
      }
      session?: {
        id: string
        userId: string
      }
      organizationId?: string
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    })

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role || 'user',
    }
    req.session = {
      id: session.session.id,
      userId: session.session.userId,
    }

    next()
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

export function requireRole(...roles: OrgRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.organizationId || !req.user) {
      return res.status(403).json({ error: 'Organization context required' })
    }

    try {
      const member = await auth.api.getActiveMember({
        headers: fromNodeHeaders(req.headers),
        query: { organizationId: req.organizationId },
      })

      if (!member || !roles.includes(member.role as OrgRole)) {
        return res.status(403).json({ error: 'Insufficient permissions' })
      }

      next()
    } catch {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
  }
}
```

- [ ] **Step 5: Remove old auth route, mount Better Auth in index.ts**

Delete `apps/api/src/routes/auth.ts`.

Update `apps/api/src/index.ts` — **CRITICAL: Better Auth handler MUST be mounted BEFORE `express.json()`**. If `express.json()` parses the body first, Better Auth client requests will hang.

```ts
import { toNodeHandler } from 'better-auth/node'
import { auth } from './auth'

// ... after helmet and cors, BEFORE express.json():

// Better Auth handler — MUST come before express.json()
app.all('/api/auth/*', toNodeHandler(auth))

// express.json() for all other routes
app.use(express.json())
```

Remove the old `import authRouter from './routes/auth'` and `app.use('/api/auth', authRouter)`.

- [ ] **Step 6: Install Better Auth on frontend**

```bash
cd apps/web
pnpm add better-auth @tanstack/react-query axios
```

- [ ] **Step 7: Create `apps/web/lib/auth-client.ts`**

```ts
import { createAuthClient } from 'better-auth/react'
import { organizationClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  basePath: '/api/auth',
  plugins: [
    organizationClient(),
  ],
})

export const {
  useSession,
  signIn,
  signUp,
  signOut,
  useActiveOrganization,
  useListOrganizations,
} = authClient
```

- [ ] **Step 8: Rewrite `apps/web/context/auth.tsx`**

Replace the entire file — Better Auth's `useSession` hook replaces the custom context:

```tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

Update `apps/web/app/layout.tsx` to use `Providers` instead of `AuthProvider`:

```tsx
import { Providers } from '@/context/auth'

// In the body:
<Providers>{children}</Providers>
```

- [ ] **Step 9: Update `apps/web/lib/axios.ts` (rename to `apps/web/lib/api.ts`)**

```ts
import axios from 'axios'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send cookies (Better Auth uses httpOnly cookies)
})

// Tenant context interceptor
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const orgId = localStorage.getItem('activeOrganizationId')
    if (orgId) {
      config.headers['X-Organization-Id'] = orgId
    }
  }
  return config
})
```

- [ ] **Step 10: Push Better Auth schema to database**

```bash
cd apps/api
pnpm db:push   # pushes the Better Auth generated schema to local Postgres
```

- [ ] **Step 11: Verify auth flow**

```bash
pnpm dev
# Test signup: POST localhost:3001/api/auth/sign-up/email
# Body: { "name": "Test User", "email": "test@test.com", "password": "password123" }
# Test login: POST localhost:3001/api/auth/sign-in/email
# Body: { "email": "test@test.com", "password": "password123" }
# Should return session cookie
```

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: replace JWT auth with Better Auth, add organization plugin"
```

---

### Task 5: Custom Database Schema

**Files:**
- Create: `apps/api/src/db/schema/plan.ts`
- Create: `apps/api/src/db/schema/subscription.ts`
- Create: `apps/api/src/db/schema/payment.ts`
- Create: `apps/api/src/db/schema/notification.ts`
- Create: `apps/api/src/db/schema/file-upload.ts`
- Create: `apps/api/src/db/schema/index.ts`
- Modify: `apps/api/src/db/schema.ts` — re-export from schema directory
- Create: `apps/api/src/db/seed.ts` — seed plans

- [ ] **Step 1: Restructure schema into directory**

Create `apps/api/src/db/schema/` directory. Move the Better Auth generated schema into it.

`apps/api/src/db/schema/plan.ts`:
```ts
import { pgTable, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core'

export const plan = pgTable('plan', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  monthlyPrice: integer('monthly_price').notNull().default(0), // smallest currency unit
  yearlyPrice: integer('yearly_price').notNull().default(0),
  currency: text('currency').notNull().default('usd'),
  features: jsonb('features').$type<Record<string, boolean>>().notNull().default({}),
  limits: jsonb('limits').$type<Record<string, string | number>>().notNull().default({}),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

`apps/api/src/db/schema/subscription.ts`:
```ts
import { pgTable, text, integer, boolean, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core'
import { plan } from './plan'

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active', 'cancelled', 'past_due', 'trialing',
])

export const subscription = pgTable('subscription', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull(),
  planId: text('plan_id').notNull().references(() => plan.id),
  status: subscriptionStatusEnum('status').notNull().default('active'),
  currentPeriodStart: timestamp('current_period_start').notNull(),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  providerSubscriptionId: text('provider_subscription_id'),
  providerData: jsonb('provider_data').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
```

`apps/api/src/db/schema/payment.ts`:
```ts
import { pgTable, text, integer, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core'
import { subscription } from './subscription'

export const paymentStatusEnum = pgEnum('payment_status', [
  'created', 'paid', 'failed', 'refunded',
])

export const payment = pgTable('payment', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull(),
  subscriptionId: text('subscription_id').references(() => subscription.id),
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('usd'),
  status: paymentStatusEnum('status').notNull().default('created'),
  providerPaymentId: text('provider_payment_id'),
  providerData: jsonb('provider_data').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

`apps/api/src/db/schema/notification.ts`:
```ts
import { pgTable, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core'

export const notification = pgTable('notification', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  organizationId: text('organization_id'),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

`apps/api/src/db/schema/file-upload.ts`:
```ts
import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core'

export const fileUpload = pgTable('file_upload', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  organizationId: text('organization_id'),
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(),
  fileSize: integer('file_size').notNull(),
  providerUrl: text('provider_url').notNull(),
  providerId: text('provider_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

`apps/api/src/db/schema/index.ts`:
```ts
// Re-export Better Auth generated tables
export * from './auth-schema'

// Custom tables
export * from './plan'
export * from './subscription'
export * from './payment'
export * from './notification'
export * from './file-upload'
```

- [ ] **Step 2: Create plan seed script**

`apps/api/src/db/seed.ts`:
```ts
import 'dotenv/config'
import { db } from './index'
import { plan } from './schema/plan'

const plans = [
  {
    name: 'Free',
    slug: 'free',
    description: 'Get started with basic features',
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: 'usd',
    features: { analytics: false, prioritySupport: false, customBranding: false },
    limits: { maxMembers: 3, maxStorage: '500MB' },
    isActive: true,
    sortOrder: 0,
  },
  {
    name: 'Pro',
    slug: 'pro',
    description: 'Everything you need to grow',
    monthlyPrice: 1999,
    yearlyPrice: 19990,
    currency: 'usd',
    features: { analytics: true, prioritySupport: false, customBranding: true },
    limits: { maxMembers: 20, maxStorage: '50GB' },
    isActive: true,
    sortOrder: 1,
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'Advanced features for large teams',
    monthlyPrice: 9999,
    yearlyPrice: 99990,
    currency: 'usd',
    features: { analytics: true, prioritySupport: true, customBranding: true },
    limits: { maxMembers: -1, maxStorage: 'unlimited' },
    isActive: true,
    sortOrder: 2,
  },
]

async function seed() {
  console.log('Seeding plans...')

  for (const p of plans) {
    await db.insert(plan).values(p).onConflictDoNothing({ target: plan.slug })
  }

  console.log('Seeding complete.')
  process.exit(0)
}

seed().catch((e) => {
  console.error('Seed failed:', e)
  process.exit(1)
})
```

- [ ] **Step 3: Add seed script to `apps/api/package.json`**

```json
{
  "scripts": {
    "db:seed": "tsx src/db/seed.ts"
  }
}
```

- [ ] **Step 4: Push schema and seed**

```bash
pnpm --filter=api db:push
pnpm --filter=api db:seed
```

- [ ] **Step 5: Verify with Drizzle Studio**

```bash
pnpm --filter=api db:studio
# Check: all tables exist (Better Auth + custom), plans are seeded
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add custom schema (plan, subscription, payment, notification, file_upload) and seed"
```

---

### Task 6: Tenant Middleware and Plan Enforcement

**Files:**
- Create: `apps/api/src/middleware/tenant.ts`
- Create: `apps/api/src/middleware/plan-limits.ts`
- Create: `apps/api/src/middleware/validate.ts`

- [ ] **Step 1: Create `apps/api/src/middleware/tenant.ts`**

```ts
import type { Request, Response, NextFunction } from 'express'
import { auth } from '../auth'
import { fromNodeHeaders } from 'better-auth/node'

export async function requireTenant(req: Request, res: Response, next: NextFunction) {
  const orgId = req.headers['x-organization-id'] as string | undefined

  if (!orgId) {
    return res.status(400).json({ error: 'X-Organization-Id header required' })
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    // Verify user is a member of this organization
    const member = await auth.api.getActiveMember({
      headers: fromNodeHeaders(req.headers),
      query: { organizationId: orgId },
    })

    if (!member) {
      return res.status(403).json({ error: 'Not a member of this organization' })
    }

    req.organizationId = orgId
    next()
  } catch {
    return res.status(403).json({ error: 'Invalid organization' })
  }
}
```

- [ ] **Step 2: Create `apps/api/src/middleware/plan-limits.ts`**

```ts
import type { Request, Response, NextFunction } from 'express'
import { db } from '../db'
import { subscription } from '../db/schema/subscription'
import { plan } from '../db/schema/plan'
import { eq, and } from 'drizzle-orm'

export function enforcePlanLimit(limitKey: string, getCurrentCount: (orgId: string) => Promise<number>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.organizationId) {
      return res.status(400).json({ error: 'Organization context required' })
    }

    try {
      const sub = await db.query.subscription.findFirst({
        where: and(
          eq(subscription.organizationId, req.organizationId),
          eq(subscription.status, 'active'),
        ),
      })

      if (!sub) {
        // No subscription = free plan, check free plan limits
        const freePlan = await db.query.plan.findFirst({
          where: eq(plan.slug, 'free'),
        })
        if (!freePlan) return next()

        const limit = (freePlan.limits as Record<string, string | number>)[limitKey]
        if (limit === undefined || limit === -1 || limit === 'unlimited') return next()

        const currentCount = await getCurrentCount(req.organizationId)
        if (typeof limit === 'number' && currentCount >= limit) {
          return res.status(403).json({
            error: 'Plan limit reached',
            limit: limitKey,
            current: currentCount,
            max: limit,
          })
        }
        return next()
      }

      const currentPlan = await db.query.plan.findFirst({
        where: eq(plan.id, sub.planId),
      })
      if (!currentPlan) return next()

      const limit = (currentPlan.limits as Record<string, string | number>)[limitKey]
      if (limit === undefined || limit === -1 || limit === 'unlimited') return next()

      const currentCount = await getCurrentCount(req.organizationId)
      if (typeof limit === 'number' && currentCount >= limit) {
        return res.status(403).json({
          error: 'Plan limit reached',
          limit: limitKey,
          current: currentCount,
          max: limit,
        })
      }

      next()
    } catch {
      next()
    }
  }
}
```

- [ ] **Step 3: Create `apps/api/src/middleware/validate.ts`**

Zod validation middleware for request bodies:

```ts
import type { Request, Response, NextFunction } from 'express'
import type { ZodSchema } from 'zod'

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      })
    }
    req.body = result.data
    next()
  }
}
```

- [ ] **Step 4: Verify type-check**

```bash
pnpm type-check
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add tenant middleware, plan enforcement, Zod validation middleware"
```

---

## Phase 3: Adapter Implementations

### Task 7: Payment Adapters

**Files:**
- Modify: `packages/payments/package.json` — add stripe, razorpay, cashfree deps
- Create: `packages/payments/src/stripe.ts`
- Create: `packages/payments/src/razorpay.ts`
- Create: `packages/payments/src/cashfree.ts`
- Modify: `packages/payments/src/index.ts` — wire up factory

- [ ] **Step 1: Install payment gateway SDKs**

```bash
cd packages/payments
pnpm add stripe razorpay cashfree-pg
```

- [ ] **Step 2: Create `packages/payments/src/stripe.ts`**

```ts
import Stripe from 'stripe'
import type { PaymentProvider, CreateOrderParams, Order, VerifyPaymentParams, PaymentResult, WebhookEvent, CreateSubscriptionParams, SubscriptionResult } from './types'

export class StripeAdapter implements PaymentProvider {
  private stripe: Stripe

  constructor(config: { secretKey: string; webhookSecret: string }) {
    this.stripe = new Stripe(config.secretKey)
    this.webhookSecret = config.webhookSecret
  }

  private webhookSecret: string

  async createOrder(params: CreateOrderParams): Promise<Order> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: params.currency,
          unit_amount: params.amount,
          product_data: { name: 'One-time payment' },
        },
        quantity: 1,
      }],
      success_url: params.returnUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
    })

    return {
      id: session.id,
      providerOrderId: session.id,
      amount: params.amount,
      currency: params.currency,
      checkoutUrl: session.url!,
      status: session.status || 'open',
    }
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<PaymentResult> {
    const session = await this.stripe.checkout.sessions.retrieve(params.providerOrderId)
    const paymentIntent = session.payment_intent as Stripe.PaymentIntent | null

    return {
      verified: session.payment_status === 'paid',
      providerPaymentId: paymentIntent?.id || params.providerPaymentId,
      amount: session.amount_total || 0,
      currency: session.currency || '',
      status: session.payment_status || 'unpaid',
    }
  }

  async handleWebhook(payload: unknown, headers: Record<string, string>): Promise<WebhookEvent> {
    const sig = headers['stripe-signature']
    const event = this.stripe.webhooks.constructEvent(
      payload as string | Buffer,
      sig,
      this.webhookSecret,
    )

    const typeMap: Record<string, WebhookEvent['type']> = {
      'checkout.session.completed': 'payment.success',
      'payment_intent.payment_failed': 'payment.failed',
      'customer.subscription.created': 'subscription.created',
      'customer.subscription.deleted': 'subscription.cancelled',
      'customer.subscription.updated': 'subscription.updated',
    }

    return {
      type: typeMap[event.type] || 'payment.success',
      providerEventId: event.id,
      providerPaymentId: (event.data.object as { id?: string })?.id,
      raw: event,
    }
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResult> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: params.currency,
          unit_amount: params.amount,
          recurring: { interval: params.interval === 'yearly' ? 'year' : 'month' },
          product_data: { name: `${params.planId} plan` },
        },
        quantity: 1,
      }],
      customer_email: params.customerEmail,
      success_url: params.returnUrl,
      cancel_url: params.cancelUrl,
      metadata: { ...params.metadata, planId: params.planId },
    })

    return {
      providerSubscriptionId: session.id,
      checkoutUrl: session.url!,
      status: 'pending',
    }
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.update(providerSubscriptionId, {
      cancel_at_period_end: true,
    })
  }

  async getPaymentStatus(providerPaymentId: string): Promise<{ status: string; amount: number; currency: string }> {
    const pi = await this.stripe.paymentIntents.retrieve(providerPaymentId)
    return {
      status: pi.status,
      amount: pi.amount,
      currency: pi.currency,
    }
  }
}
```

- [ ] **Step 3: Create `packages/payments/src/razorpay.ts`**

```ts
import Razorpay from 'razorpay'
import crypto from 'node:crypto'
import type { PaymentProvider, CreateOrderParams, Order, VerifyPaymentParams, PaymentResult, WebhookEvent, CreateSubscriptionParams, SubscriptionResult } from './types'

export class RazorpayAdapter implements PaymentProvider {
  private razorpay: InstanceType<typeof Razorpay>
  private keySecret: string
  private webhookSecret: string

  constructor(config: { keyId: string; keySecret: string; webhookSecret: string }) {
    this.razorpay = new Razorpay({ key_id: config.keyId, key_secret: config.keySecret })
    this.keySecret = config.keySecret
    this.webhookSecret = config.webhookSecret
  }

  async createOrder(params: CreateOrderParams): Promise<Order> {
    const order = await this.razorpay.orders.create({
      amount: params.amount,
      currency: params.currency.toUpperCase(),
      notes: params.metadata || {},
    })

    return {
      id: order.id,
      providerOrderId: order.id,
      amount: order.amount as number,
      currency: order.currency,
      checkoutUrl: '', // Razorpay uses client-side checkout, no redirect URL
      status: order.status,
    }
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<PaymentResult> {
    const body = `${params.providerOrderId}|${params.providerPaymentId}`
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(body)
      .digest('hex')

    const verified = expectedSignature === params.providerSignature

    return {
      verified,
      providerPaymentId: params.providerPaymentId,
      amount: 0, // Razorpay doesn't return amount in verify flow
      currency: '',
      status: verified ? 'paid' : 'failed',
    }
  }

  async handleWebhook(payload: unknown, headers: Record<string, string>): Promise<WebhookEvent> {
    const sig = headers['x-razorpay-signature']
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload)
    const expectedSig = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(body)
      .digest('hex')

    if (sig !== expectedSig) {
      throw new Error('Invalid webhook signature')
    }

    const event = typeof payload === 'string' ? JSON.parse(payload) : payload
    const eventType = (event as { event?: string })?.event || ''

    const typeMap: Record<string, WebhookEvent['type']> = {
      'payment.captured': 'payment.success',
      'payment.failed': 'payment.failed',
      'subscription.activated': 'subscription.created',
      'subscription.cancelled': 'subscription.cancelled',
      'subscription.updated': 'subscription.updated',
    }

    return {
      type: typeMap[eventType] || 'payment.success',
      providerEventId: (event as { payload?: { payment?: { entity?: { id?: string } } } })?.payload?.payment?.entity?.id || '',
      providerPaymentId: (event as { payload?: { payment?: { entity?: { id?: string } } } })?.payload?.payment?.entity?.id,
      raw: event,
    }
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResult> {
    const plan = await this.razorpay.plans.create({
      period: params.interval === 'yearly' ? 'yearly' : 'monthly',
      interval: 1,
      item: {
        name: `${params.planId} plan`,
        amount: params.amount,
        currency: params.currency.toUpperCase(),
      },
    })

    const sub = await this.razorpay.subscriptions.create({
      plan_id: plan.id,
      total_count: params.interval === 'yearly' ? 10 : 120,
      notes: { ...params.metadata, planId: params.planId },
    })

    return {
      providerSubscriptionId: sub.id,
      checkoutUrl: sub.short_url || '',
      status: sub.status || 'created',
    }
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    await this.razorpay.subscriptions.cancel(providerSubscriptionId, false)
  }

  async getPaymentStatus(providerPaymentId: string): Promise<{ status: string; amount: number; currency: string }> {
    const payment = await this.razorpay.payments.fetch(providerPaymentId)
    return {
      status: payment.status as string,
      amount: payment.amount as number,
      currency: payment.currency as string,
    }
  }
}
```

- [ ] **Step 4: Create `packages/payments/src/cashfree.ts`**

```ts
import { Cashfree } from 'cashfree-pg'
import crypto from 'node:crypto'
import type { PaymentProvider, CreateOrderParams, Order, VerifyPaymentParams, PaymentResult, WebhookEvent, CreateSubscriptionParams, SubscriptionResult } from './types'

export class CashfreeAdapter implements PaymentProvider {
  private webhookSecret: string

  constructor(config: { appId: string; secretKey: string; webhookSecret: string; environment?: 'sandbox' | 'production' }) {
    Cashfree.XClientId = config.appId
    Cashfree.XClientSecret = config.secretKey
    Cashfree.XEnvironment = config.environment === 'production'
      ? Cashfree.Environment.PRODUCTION
      : Cashfree.Environment.SANDBOX
    this.webhookSecret = config.webhookSecret
  }

  async createOrder(params: CreateOrderParams): Promise<Order> {
    const orderId = `order_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`

    const response = await Cashfree.PGCreateOrder('2023-08-01', {
      order_id: orderId,
      order_amount: params.amount / 100, // Cashfree uses major units
      order_currency: params.currency.toUpperCase(),
      customer_details: {
        customer_id: params.metadata?.customerId || 'guest',
        customer_email: params.metadata?.customerEmail,
        customer_phone: params.metadata?.customerPhone || '9999999999',
      },
      order_meta: {
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
      },
    })

    const data = response.data as { cf_order_id: string; payment_session_id: string; order_status: string }

    return {
      id: orderId,
      providerOrderId: data.cf_order_id?.toString() || orderId,
      amount: params.amount,
      currency: params.currency,
      checkoutUrl: data.payment_session_id || '',
      status: data.order_status || 'ACTIVE',
    }
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<PaymentResult> {
    const response = await Cashfree.PGOrderFetchPayments('2023-08-01', params.providerOrderId)
    const payments = response.data as Array<{ cf_payment_id: number; payment_status: string; payment_amount: number; payment_currency: string }>
    const payment = payments?.[0]

    return {
      verified: payment?.payment_status === 'SUCCESS',
      providerPaymentId: payment?.cf_payment_id?.toString() || params.providerPaymentId,
      amount: Math.round((payment?.payment_amount || 0) * 100),
      currency: payment?.payment_currency || '',
      status: payment?.payment_status || 'FAILED',
    }
  }

  async handleWebhook(payload: unknown, headers: Record<string, string>): Promise<WebhookEvent> {
    const timestamp = headers['x-cashfree-timestamp']
    const signature = headers['x-cashfree-signature']
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload)
    const data = `${timestamp}${body}`
    const expectedSig = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(data)
      .digest('base64')

    if (signature !== expectedSig) {
      throw new Error('Invalid webhook signature')
    }

    const event = typeof payload === 'string' ? JSON.parse(payload) : payload
    const eventType = (event as { type?: string })?.type || ''

    const typeMap: Record<string, WebhookEvent['type']> = {
      PAYMENT_SUCCESS_WEBHOOK: 'payment.success',
      PAYMENT_FAILED_WEBHOOK: 'payment.failed',
      SUBSCRIPTION_NEW_WEBHOOK: 'subscription.created',
      SUBSCRIPTION_CANCELLED_WEBHOOK: 'subscription.cancelled',
    }

    return {
      type: typeMap[eventType] || 'payment.success',
      providerEventId: (event as { data?: { order?: { order_id?: string } } })?.data?.order?.order_id || '',
      raw: event,
    }
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResult> {
    const response = await Cashfree.PGCreateOrder('2023-08-01', {
      order_id: `sub_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      order_amount: params.amount / 100,
      order_currency: params.currency.toUpperCase(),
      customer_details: {
        customer_id: params.metadata?.customerId || 'guest',
        customer_email: params.customerEmail,
        customer_phone: params.metadata?.customerPhone || '9999999999',
      },
      order_meta: {
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
      },
    })

    const data = response.data as { cf_order_id: string; payment_session_id: string }

    return {
      providerSubscriptionId: data.cf_order_id?.toString() || '',
      checkoutUrl: data.payment_session_id || '',
      status: 'pending',
    }
  }

  async cancelSubscription(_providerSubscriptionId: string): Promise<void> {
    // Cashfree subscription cancellation via their subscription API
    // Implementation depends on Cashfree subscription product being enabled
    throw new Error('Cashfree subscription cancellation not yet implemented')
  }

  async getPaymentStatus(providerPaymentId: string): Promise<{ status: string; amount: number; currency: string }> {
    const response = await Cashfree.PGOrderFetchPayments('2023-08-01', providerPaymentId)
    const payments = response.data as Array<{ payment_status: string; payment_amount: number; payment_currency: string }>
    const payment = payments?.[0]

    return {
      status: payment?.payment_status || 'UNKNOWN',
      amount: Math.round((payment?.payment_amount || 0) * 100),
      currency: payment?.payment_currency || '',
    }
  }
}
```

- [ ] **Step 5: Update `packages/payments/src/index.ts` factory**

```ts
import type { PaymentProvider } from './types'
import { StripeAdapter } from './stripe'
import { RazorpayAdapter } from './razorpay'
import { CashfreeAdapter } from './cashfree'

export type { PaymentProvider, CreateOrderParams, Order, VerifyPaymentParams, PaymentResult, WebhookEvent, CreateSubscriptionParams, SubscriptionResult } from './types'

export function createPaymentProvider(provider: string, config: Record<string, string>): PaymentProvider {
  switch (provider) {
    case 'stripe':
      return new StripeAdapter({
        secretKey: config.STRIPE_SECRET_KEY!,
        webhookSecret: config.STRIPE_WEBHOOK_SECRET!,
      })
    case 'razorpay':
      return new RazorpayAdapter({
        keyId: config.RAZORPAY_KEY_ID!,
        keySecret: config.RAZORPAY_KEY_SECRET!,
        webhookSecret: config.RAZORPAY_WEBHOOK_SECRET!,
      })
    case 'cashfree':
      return new CashfreeAdapter({
        appId: config.CASHFREE_APP_ID!,
        secretKey: config.CASHFREE_SECRET_KEY!,
        webhookSecret: config.CASHFREE_WEBHOOK_SECRET!,
        environment: config.NODE_ENV === 'production' ? 'production' : 'sandbox',
      })
    default:
      throw new Error(`Unknown payment provider: ${provider}`)
  }
}
```

- [ ] **Step 6: Verify type-check**

```bash
pnpm type-check
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: implement payment adapters (Stripe, Razorpay, Cashfree)"
```

---

### Task 8: Email Adapter

**Files:**
- Modify: `packages/email/package.json` — add nodemailer, resend, @aws-sdk/client-ses deps
- Create: `packages/email/src/smtp.ts`
- Create: `packages/email/src/resend.ts`
- Create: `packages/email/src/ses.ts`
- Create: `packages/email/src/templates/welcome.ts`
- Create: `packages/email/src/templates/verification.ts`
- Create: `packages/email/src/templates/password-reset.ts`
- Create: `packages/email/src/templates/invitation.ts`
- Create: `packages/email/src/templates/payment-receipt.ts`
- Create: `packages/email/src/templates/index.ts`
- Modify: `packages/email/src/index.ts`

- [ ] **Step 1: Install deps**

```bash
cd packages/email
pnpm add nodemailer resend @aws-sdk/client-ses
pnpm add -D @types/nodemailer
```

- [ ] **Step 2: Create SMTP adapter**

`packages/email/src/smtp.ts`:
```ts
import nodemailer from 'nodemailer'
import type { EmailProvider, SendEmailParams } from './types'

export class SmtpAdapter implements EmailProvider {
  private transporter: nodemailer.Transporter

  constructor(config: { host: string; port: number; user: string; pass: string; from: string }) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
    })
    this.defaultFrom = config.from
  }

  private defaultFrom: string

  async send(params: SendEmailParams): Promise<void> {
    await this.transporter.sendMail({
      from: params.from || this.defaultFrom,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
    })
  }

  async sendBatch(emails: SendEmailParams[]): Promise<void> {
    await Promise.all(emails.map((e) => this.send(e)))
  }
}
```

- [ ] **Step 3: Create Resend adapter**

`packages/email/src/resend.ts`:
```ts
import { Resend } from 'resend'
import type { EmailProvider, SendEmailParams } from './types'

export class ResendAdapter implements EmailProvider {
  private resend: Resend
  private defaultFrom: string

  constructor(config: { apiKey: string; from: string }) {
    this.resend = new Resend(config.apiKey)
    this.defaultFrom = config.from
  }

  async send(params: SendEmailParams): Promise<void> {
    await this.resend.emails.send({
      from: params.from || this.defaultFrom,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      reply_to: params.replyTo,
    })
  }

  async sendBatch(emails: SendEmailParams[]): Promise<void> {
    await this.resend.batch.send(
      emails.map((e) => ({
        from: e.from || this.defaultFrom,
        to: e.to,
        subject: e.subject,
        html: e.html,
        text: e.text,
      })),
    )
  }
}
```

- [ ] **Step 4: Create SES adapter**

`packages/email/src/ses.ts`:
```ts
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import type { EmailProvider, SendEmailParams } from './types'

export class SesAdapter implements EmailProvider {
  private ses: SESClient
  private defaultFrom: string

  constructor(config: { accessKeyId: string; secretAccessKey: string; region: string; from: string }) {
    this.ses = new SESClient({
      region: config.region,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    })
    this.defaultFrom = config.from
  }

  async send(params: SendEmailParams): Promise<void> {
    await this.ses.send(new SendEmailCommand({
      Source: params.from || this.defaultFrom,
      Destination: { ToAddresses: [params.to] },
      Message: {
        Subject: { Data: params.subject },
        Body: {
          Html: { Data: params.html },
          ...(params.text && { Text: { Data: params.text } }),
        },
      },
      ReplyToAddresses: params.replyTo ? [params.replyTo] : undefined,
    }))
  }

  async sendBatch(emails: SendEmailParams[]): Promise<void> {
    await Promise.all(emails.map((e) => this.send(e)))
  }
}
```

- [ ] **Step 5: Create email templates**

`packages/email/src/templates/welcome.ts`:
```ts
import type { TemplateData } from '../types'

export function welcomeEmail(data: TemplateData & { name: string }) {
  return {
    subject: `Welcome to ${data.appName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Welcome, ${data.name}!</h1>
        <p>Thanks for signing up for ${data.appName}.</p>
        <p>Get started by visiting your <a href="${data.appUrl}/dashboard">dashboard</a>.</p>
      </div>
    `,
    text: `Welcome, ${data.name}! Thanks for signing up for ${data.appName}. Get started at ${data.appUrl}/dashboard`,
  }
}
```

`packages/email/src/templates/verification.ts`:
```ts
import type { TemplateData } from '../types'

export function verificationEmail(data: TemplateData & { verificationUrl: string }) {
  return {
    subject: `Verify your email - ${data.appName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Verify your email</h1>
        <p>Click the link below to verify your email address:</p>
        <p><a href="${data.verificationUrl}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a></p>
        <p style="color: #666; font-size: 14px;">If you didn't create an account, you can ignore this email.</p>
      </div>
    `,
    text: `Verify your email: ${data.verificationUrl}`,
  }
}
```

`packages/email/src/templates/password-reset.ts`:
```ts
import type { TemplateData } from '../types'

export function passwordResetEmail(data: TemplateData & { resetUrl: string }) {
  return {
    subject: `Reset your password - ${data.appName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Reset your password</h1>
        <p>Click the link below to reset your password:</p>
        <p><a href="${data.resetUrl}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a></p>
        <p style="color: #666; font-size: 14px;">This link expires in 1 hour. If you didn't request a reset, ignore this email.</p>
      </div>
    `,
    text: `Reset your password: ${data.resetUrl}`,
  }
}
```

`packages/email/src/templates/invitation.ts`:
```ts
import type { TemplateData } from '../types'

export function invitationEmail(data: TemplateData & { inviterName: string; orgName: string; inviteUrl: string }) {
  return {
    subject: `You're invited to join ${data.orgName} on ${data.appName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>You've been invited!</h1>
        <p>${data.inviterName} has invited you to join <strong>${data.orgName}</strong> on ${data.appName}.</p>
        <p><a href="${data.inviteUrl}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a></p>
      </div>
    `,
    text: `${data.inviterName} invited you to join ${data.orgName} on ${data.appName}. Accept: ${data.inviteUrl}`,
  }
}
```

`packages/email/src/templates/payment-receipt.ts`:
```ts
import type { TemplateData } from '../types'

export function paymentReceiptEmail(data: TemplateData & { amount: string; planName: string; date: string }) {
  return {
    subject: `Payment receipt - ${data.appName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Payment received</h1>
        <p>We received your payment of <strong>${data.amount}</strong> for the <strong>${data.planName}</strong> plan.</p>
        <p>Date: ${data.date}</p>
        <p><a href="${data.appUrl}/billing/invoices">View billing history</a></p>
      </div>
    `,
    text: `Payment received: ${data.amount} for ${data.planName} plan on ${data.date}`,
  }
}
```

`packages/email/src/templates/index.ts`:
```ts
export { welcomeEmail } from './welcome'
export { verificationEmail } from './verification'
export { passwordResetEmail } from './password-reset'
export { invitationEmail } from './invitation'
export { paymentReceiptEmail } from './payment-receipt'
```

- [ ] **Step 6: Update factory**

`packages/email/src/index.ts`:
```ts
import type { EmailProvider } from './types'
import { SmtpAdapter } from './smtp'
import { ResendAdapter } from './resend'
import { SesAdapter } from './ses'

export type { EmailProvider, SendEmailParams, TemplateData } from './types'
export * from './templates'

export function createEmailProvider(provider: string, config: Record<string, string>): EmailProvider {
  switch (provider) {
    case 'smtp':
      return new SmtpAdapter({
        host: config.SMTP_HOST!,
        port: Number(config.SMTP_PORT) || 587,
        user: config.SMTP_USER!,
        pass: config.SMTP_PASS!,
        from: config.FROM_EMAIL!,
      })
    case 'resend':
      return new ResendAdapter({
        apiKey: config.RESEND_API_KEY!,
        from: config.FROM_EMAIL!,
      })
    case 'ses':
      return new SesAdapter({
        accessKeyId: config.AWS_ACCESS_KEY_ID!,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY!,
        region: config.AWS_REGION!,
        from: config.FROM_EMAIL!,
      })
    default:
      throw new Error(`Unknown email provider: ${provider}`)
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: implement email adapters (SMTP, Resend, SES) with templates"
```

---

### Task 9: Storage Adapter

**Files:**
- Modify: `packages/storage/package.json` — add cloudinary, @aws-sdk/client-s3, @google-cloud/storage deps
- Create: `packages/storage/src/cloudinary.ts`
- Create: `packages/storage/src/s3.ts`
- Create: `packages/storage/src/gcs.ts`
- Modify: `packages/storage/src/index.ts`

- [ ] **Step 1: Install deps**

```bash
cd packages/storage
pnpm add cloudinary @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @google-cloud/storage
```

- [ ] **Step 2: Create Cloudinary adapter**

`packages/storage/src/cloudinary.ts`:
```ts
import { v2 as cloudinary } from 'cloudinary'
import type { StorageProvider, UploadOptions, UploadResult } from './types'

export class CloudinaryAdapter implements StorageProvider {
  constructor(config: { cloudName: string; apiKey: string; apiSecret: string }) {
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
    })
  }

  async upload(file: Buffer, options: UploadOptions): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: options.folder,
          resource_type: 'auto',
          public_id: options.fileName.replace(/\.[^.]+$/, ''),
        },
        (error, result) => {
          if (error || !result) return reject(error || new Error('Upload failed'))
          resolve({
            providerId: result.public_id,
            providerUrl: result.secure_url,
            fileName: options.fileName,
            fileSize: result.bytes,
            mimeType: options.mimeType,
          })
        },
      ).end(file)
    })
  }

  async delete(providerId: string): Promise<void> {
    await cloudinary.uploader.destroy(providerId)
  }

  async getSignedUrl(providerId: string, expiresIn = 3600): Promise<string> {
    return cloudinary.url(providerId, {
      sign_url: true,
      type: 'authenticated',
      expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    })
  }
}
```

- [ ] **Step 3: Create S3 adapter**

`packages/storage/src/s3.ts`:
```ts
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { StorageProvider, UploadOptions, UploadResult } from './types'

export class S3Adapter implements StorageProvider {
  private s3: S3Client
  private bucket: string
  private region: string

  constructor(config: { accessKeyId: string; secretAccessKey: string; bucket: string; region: string }) {
    this.s3 = new S3Client({
      region: config.region,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    })
    this.bucket = config.bucket
    this.region = config.region
  }

  async upload(file: Buffer, options: UploadOptions): Promise<UploadResult> {
    const key = options.folder ? `${options.folder}/${options.fileName}` : options.fileName

    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file,
      ContentType: options.mimeType,
    }))

    return {
      providerId: key,
      providerUrl: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`,
      fileName: options.fileName,
      fileSize: file.length,
      mimeType: options.mimeType,
    }
  }

  async delete(providerId: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: providerId,
    }))
  }

  async getSignedUrl(providerId: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(this.s3, new GetObjectCommand({
      Bucket: this.bucket,
      Key: providerId,
    }), { expiresIn })
  }
}
```

- [ ] **Step 4: Create GCS adapter**

`packages/storage/src/gcs.ts`:
```ts
import { Storage } from '@google-cloud/storage'
import type { StorageProvider, UploadOptions, UploadResult } from './types'

export class GcsAdapter implements StorageProvider {
  private storage: Storage
  private bucket: string

  constructor(config: { projectId: string; keyFile?: string; bucket: string }) {
    this.storage = new Storage({
      projectId: config.projectId,
      ...(config.keyFile && { keyFilename: config.keyFile }),
    })
    this.bucket = config.bucket
  }

  async upload(file: Buffer, options: UploadOptions): Promise<UploadResult> {
    const fileName = options.folder ? `${options.folder}/${options.fileName}` : options.fileName
    const bucket = this.storage.bucket(this.bucket)
    const blob = bucket.file(fileName)

    await blob.save(file, {
      contentType: options.mimeType,
      public: options.public,
    })

    return {
      providerId: fileName,
      providerUrl: `https://storage.googleapis.com/${this.bucket}/${fileName}`,
      fileName: options.fileName,
      fileSize: file.length,
      mimeType: options.mimeType,
    }
  }

  async delete(providerId: string): Promise<void> {
    await this.storage.bucket(this.bucket).file(providerId).delete()
  }

  async getSignedUrl(providerId: string, expiresIn = 3600): Promise<string> {
    const [url] = await this.storage.bucket(this.bucket).file(providerId).getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresIn * 1000,
    })
    return url
  }
}
```

- [ ] **Step 5: Update factory**

`packages/storage/src/index.ts`:
```ts
import type { StorageProvider } from './types'
import { CloudinaryAdapter } from './cloudinary'
import { S3Adapter } from './s3'
import { GcsAdapter } from './gcs'

export type { StorageProvider, UploadOptions, UploadResult } from './types'

export function createStorageProvider(provider: string, config: Record<string, string>): StorageProvider {
  switch (provider) {
    case 'cloudinary':
      return new CloudinaryAdapter({
        cloudName: config.CLOUDINARY_CLOUD_NAME!,
        apiKey: config.CLOUDINARY_API_KEY!,
        apiSecret: config.CLOUDINARY_API_SECRET!,
      })
    case 's3':
      return new S3Adapter({
        accessKeyId: config.AWS_ACCESS_KEY_ID!,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY!,
        bucket: config.S3_BUCKET!,
        region: config.S3_REGION!,
      })
    case 'gcs':
      return new GcsAdapter({
        projectId: config.GCS_PROJECT_ID!,
        keyFile: config.GCS_KEY_FILE,
        bucket: config.GCS_BUCKET!,
      })
    default:
      throw new Error(`Unknown storage provider: ${provider}`)
  }
}
```

- [ ] **Step 6: Verify all packages**

```bash
pnpm type-check
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: implement storage adapters (Cloudinary, S3, GCS)"
```

---

## Phase 4: API Routes and Services

### Task 10: Initialize Adapters in API

**Files:**
- Create: `apps/api/src/providers.ts`
- Modify: `apps/api/src/index.ts` — import providers
- Modify: `apps/api/package.json` — add workspace deps

- [ ] **Step 1: Add workspace package deps to API**

```bash
cd apps/api
pnpm add @repo/payments@workspace:* @repo/email@workspace:* @repo/storage@workspace:* @repo/shared@workspace:*
```

- [ ] **Step 2: Create `apps/api/src/providers.ts`**

```ts
import { createPaymentProvider } from '@repo/payments'
import { createEmailProvider } from '@repo/email'
import { createStorageProvider } from '@repo/storage'
import { env } from './env'

export const payments = createPaymentProvider(env.PAYMENT_PROVIDER, process.env as Record<string, string>)
export const email = createEmailProvider(env.EMAIL_PROVIDER, process.env as Record<string, string>)
export const storage = createStorageProvider(env.STORAGE_PROVIDER, process.env as Record<string, string>)
```

- [ ] **Step 3: Import in `apps/api/src/index.ts`**

Add at the top of index.ts after other imports:

```ts
// Initialize adapters (validates config at startup)
import './providers'
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: wire adapter packages into API startup"
```

---

### Task 11: Billing Service and Routes

**Files:**
- Create: `apps/api/src/services/billing.service.ts`
- Create: `apps/api/src/routes/billing.ts`
- Modify: `apps/api/src/index.ts` — mount billing routes

- [ ] **Step 1: Create `apps/api/src/services/billing.service.ts`**

```ts
import { db } from '../db'
import { plan, subscription, payment } from '../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { payments } from '../providers'
import type { WebhookEvent } from '@repo/payments'

export async function listPlans() {
  return db.query.plan.findMany({
    where: eq(plan.isActive, true),
    orderBy: plan.sortOrder,
  })
}

export async function getActiveSubscription(organizationId: string) {
  return db.query.subscription.findFirst({
    where: and(
      eq(subscription.organizationId, organizationId),
      eq(subscription.status, 'active'),
    ),
  })
}

export async function createCheckout(params: {
  organizationId: string
  planSlug: string
  interval: 'monthly' | 'yearly'
  customerEmail: string
  customerName: string
  returnUrl: string
  cancelUrl: string
}) {
  const targetPlan = await db.query.plan.findFirst({
    where: eq(plan.slug, params.planSlug),
  })
  if (!targetPlan) throw new Error('Plan not found')

  const amount = params.interval === 'yearly' ? targetPlan.yearlyPrice : targetPlan.monthlyPrice
  if (amount === 0) throw new Error('Cannot checkout for free plan')

  const result = await payments.createSubscription({
    planId: targetPlan.id,
    customerEmail: params.customerEmail,
    customerName: params.customerName,
    amount,
    currency: targetPlan.currency,
    interval: params.interval,
    returnUrl: params.returnUrl,
    cancelUrl: params.cancelUrl,
    metadata: {
      organizationId: params.organizationId,
      planId: targetPlan.id,
      planSlug: targetPlan.slug,
    },
  })

  return { checkoutUrl: result.checkoutUrl }
}

export async function handlePaymentWebhook(event: WebhookEvent, organizationId?: string) {
  // Idempotency check
  if (event.providerPaymentId) {
    const existing = await db.query.payment.findFirst({
      where: eq(payment.providerPaymentId, event.providerPaymentId),
    })
    if (existing) return existing
  }

  if (event.type === 'payment.success' && organizationId) {
    const [newPayment] = await db.insert(payment).values({
      organizationId,
      amount: event.amount || 0,
      currency: event.currency || 'usd',
      status: 'paid',
      providerPaymentId: event.providerPaymentId,
      providerData: event.raw as Record<string, unknown>,
    }).returning()
    return newPayment
  }

  if (event.type === 'subscription.cancelled' && event.providerSubscriptionId) {
    await db.update(subscription)
      .set({ status: 'cancelled', cancelAtPeriodEnd: true, updatedAt: new Date() })
      .where(eq(subscription.providerSubscriptionId, event.providerSubscriptionId))
  }
}

export async function cancelSubscription(organizationId: string) {
  const sub = await getActiveSubscription(organizationId)
  if (!sub) throw new Error('No active subscription')
  if (!sub.providerSubscriptionId) throw new Error('No provider subscription')

  await payments.cancelSubscription(sub.providerSubscriptionId)

  await db.update(subscription)
    .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
    .where(eq(subscription.id, sub.id))
}

export async function listPayments(organizationId: string, limit = 20, offset = 0) {
  return db.query.payment.findMany({
    where: eq(payment.organizationId, organizationId),
    orderBy: desc(payment.createdAt),
    limit,
    offset,
  })
}
```

- [ ] **Step 2: Create `apps/api/src/routes/billing.ts`**

```ts
import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { requireTenant } from '../middleware/tenant'
import { requireRole } from '../middleware/auth'
import { validate } from '../middleware/validate'
import * as billingService from '../services/billing.service'
import { payments } from '../providers'
import { env } from '../env'

const router = Router()

// Public: list plans
router.get('/plans', async (_req, res) => {
  const plans = await billingService.listPlans()
  res.json(plans)
})

// Get current subscription
router.get('/subscription', requireAuth, requireTenant, async (req, res) => {
  const sub = await billingService.getActiveSubscription(req.organizationId!)
  res.json(sub || { status: 'free' })
})

// Create checkout session
const checkoutSchema = z.object({
  planSlug: z.string(),
  interval: z.enum(['monthly', 'yearly']),
})

router.post('/checkout', requireAuth, requireTenant, requireRole('owner', 'admin'), validate(checkoutSchema), async (req, res) => {
  try {
    const result = await billingService.createCheckout({
      organizationId: req.organizationId!,
      planSlug: req.body.planSlug,
      interval: req.body.interval,
      customerEmail: req.user!.email,
      customerName: req.user!.name,
      returnUrl: `${env.FRONTEND_URL}/billing?success=true`,
      cancelUrl: `${env.FRONTEND_URL}/billing?cancelled=true`,
    })
    res.json(result)
  } catch (error) {
    res.status(400).json({ error: (error as Error).message })
  }
})

// Webhook (no auth — called by payment provider)
router.post('/webhook', async (req, res) => {
  try {
    const event = await payments.handleWebhook(req.body, req.headers as Record<string, string>)
    const metadata = (event.raw as { metadata?: { organizationId?: string } })?.metadata
    await billingService.handlePaymentWebhook(event, metadata?.organizationId)
    res.json({ received: true })
  } catch (error) {
    res.status(400).json({ error: (error as Error).message })
  }
})

// Cancel subscription
router.post('/cancel', requireAuth, requireTenant, requireRole('owner', 'admin'), async (req, res) => {
  try {
    await billingService.cancelSubscription(req.organizationId!)
    res.json({ success: true })
  } catch (error) {
    res.status(400).json({ error: (error as Error).message })
  }
})

// Payment history
router.get('/invoices', requireAuth, requireTenant, async (req, res) => {
  const limit = Number(req.query.limit) || 20
  const offset = Number(req.query.offset) || 0
  const payments = await billingService.listPayments(req.organizationId!, limit, offset)
  res.json(payments)
})

export default router
```

- [ ] **Step 3: Mount in `apps/api/src/index.ts`**

```ts
import billingRouter from './routes/billing'
// ...
app.use('/api/billing', billingRouter)
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add billing service and routes (plans, checkout, webhooks, invoices)"
```

---

### Task 12: Notification Service and Routes

**Files:**
- Create: `apps/api/src/services/notification.service.ts`
- Create: `apps/api/src/routes/notifications.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Create `apps/api/src/services/notification.service.ts`**

```ts
import { db } from '../db'
import { notification } from '../db/schema'
import { eq, and, desc } from 'drizzle-orm'

export async function createNotification(params: {
  userId: string
  organizationId?: string
  type: string
  title: string
  message: string
  metadata?: Record<string, unknown>
}) {
  const [result] = await db.insert(notification).values(params).returning()
  return result
}

export async function listNotifications(userId: string, organizationId?: string, limit = 20, offset = 0) {
  const conditions = [eq(notification.userId, userId)]
  if (organizationId) {
    conditions.push(eq(notification.organizationId, organizationId))
  }

  return db.query.notification.findMany({
    where: and(...conditions),
    orderBy: desc(notification.createdAt),
    limit,
    offset,
  })
}

export async function getUnreadCount(userId: string, organizationId?: string) {
  const conditions = [eq(notification.userId, userId), eq(notification.isRead, false)]
  if (organizationId) {
    conditions.push(eq(notification.organizationId, organizationId))
  }

  const results = await db.query.notification.findMany({
    where: and(...conditions),
  })
  return results.length
}

export async function markAsRead(notificationId: string, userId: string) {
  await db.update(notification)
    .set({ isRead: true })
    .where(and(eq(notification.id, notificationId), eq(notification.userId, userId)))
}

export async function markAllAsRead(userId: string, organizationId?: string) {
  const conditions = [eq(notification.userId, userId), eq(notification.isRead, false)]
  if (organizationId) {
    conditions.push(eq(notification.organizationId, organizationId))
  }

  await db.update(notification).set({ isRead: true }).where(and(...conditions))
}
```

- [ ] **Step 2: Create `apps/api/src/routes/notifications.ts`**

```ts
import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { requireTenant } from '../middleware/tenant'
import * as notificationService from '../services/notification.service'

const router = Router()

router.get('/', requireAuth, requireTenant, async (req, res) => {
  const limit = Number(req.query.limit) || 20
  const offset = Number(req.query.offset) || 0
  const notifications = await notificationService.listNotifications(
    req.user!.id, req.organizationId, limit, offset,
  )
  res.json(notifications)
})

router.get('/unread-count', requireAuth, requireTenant, async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user!.id, req.organizationId)
  res.json({ count })
})

router.put('/:id/read', requireAuth, async (req, res) => {
  await notificationService.markAsRead(req.params.id, req.user!.id)
  res.json({ success: true })
})

router.put('/read-all', requireAuth, requireTenant, async (req, res) => {
  await notificationService.markAllAsRead(req.user!.id, req.organizationId)
  res.json({ success: true })
})

export default router
```

- [ ] **Step 3: Mount and commit**

Add to `apps/api/src/index.ts`:
```ts
import notificationsRouter from './routes/notifications'
app.use('/api/notifications', notificationsRouter)
```

```bash
git add -A
git commit -m "feat: add notification service and routes"
```

---

### Task 13: Upload and User Routes

**Files:**
- Create: `apps/api/src/services/upload.service.ts`
- Create: `apps/api/src/routes/uploads.ts`
- Create: `apps/api/src/routes/users.ts`
- Create: `apps/api/src/routes/admin.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Create `apps/api/src/services/upload.service.ts`**

```ts
import { db } from '../db'
import { fileUpload } from '../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { storage } from '../providers'

export async function uploadFile(params: {
  userId: string
  organizationId?: string
  file: Buffer
  fileName: string
  mimeType: string
  fileSize: number
}) {
  const result = await storage.upload(params.file, {
    fileName: params.fileName,
    mimeType: params.mimeType,
    folder: params.organizationId || 'uploads',
  })

  const [record] = await db.insert(fileUpload).values({
    userId: params.userId,
    organizationId: params.organizationId,
    fileName: params.fileName,
    fileType: params.mimeType,
    fileSize: params.fileSize,
    providerUrl: result.providerUrl,
    providerId: result.providerId,
  }).returning()

  return record
}

export async function listFiles(organizationId: string, limit = 20, offset = 0) {
  return db.query.fileUpload.findMany({
    where: eq(fileUpload.organizationId, organizationId),
    orderBy: desc(fileUpload.createdAt),
    limit,
    offset,
  })
}

export async function deleteFile(fileId: string, userId: string) {
  const file = await db.query.fileUpload.findFirst({
    where: and(eq(fileUpload.id, fileId), eq(fileUpload.userId, userId)),
  })
  if (!file) throw new Error('File not found')

  await storage.delete(file.providerId)
  await db.delete(fileUpload).where(eq(fileUpload.id, fileId))
}
```

- [ ] **Step 2: Create `apps/api/src/routes/uploads.ts`**

```ts
import { Router } from 'express'
import multer from 'multer'
import { requireAuth } from '../middleware/auth'
import { requireTenant } from '../middleware/tenant'
import * as uploadService from '../services/upload.service'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })
const router = Router()

router.post('/', requireAuth, requireTenant, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' })

  try {
    const result = await uploadService.uploadFile({
      userId: req.user!.id,
      organizationId: req.organizationId,
      file: req.file.buffer,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

router.get('/', requireAuth, requireTenant, async (req, res) => {
  const limit = Number(req.query.limit) || 20
  const offset = Number(req.query.offset) || 0
  const files = await uploadService.listFiles(req.organizationId!, limit, offset)
  res.json(files)
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await uploadService.deleteFile(req.params.id, req.user!.id)
    res.json({ success: true })
  } catch (error) {
    res.status(400).json({ error: (error as Error).message })
  }
})

export default router
```

- [ ] **Step 3: Create `apps/api/src/routes/users.ts`**

```ts
import { Router } from 'express'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.get('/me', requireAuth, (req, res) => {
  res.json(req.user)
})

export default router
```

- [ ] **Step 4: Create `apps/api/src/routes/admin.ts`**

```ts
import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { db } from '../db'
import { sql } from 'drizzle-orm'

const router = Router()

// Simple admin guard — checks user.role === 'admin'
function requireAdmin(req: any, res: any, next: any) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

router.get('/stats', requireAuth, requireAdmin, async (_req, res) => {
  const [userCount] = await db.execute(sql`SELECT count(*) as count FROM "user"`)
  const [orgCount] = await db.execute(sql`SELECT count(*) as count FROM "organization"`)

  res.json({
    users: Number((userCount as { count: string }).count),
    organizations: Number((orgCount as { count: string }).count),
  })
})

export default router
```

- [ ] **Step 5: Install multer and mount all routes**

```bash
cd apps/api
pnpm add multer
pnpm add -D @types/multer
```

Update `apps/api/src/index.ts`:
```ts
import usersRouter from './routes/users'
import uploadsRouter from './routes/uploads'
import adminRouter from './routes/admin'

app.use('/api/users', usersRouter)
app.use('/api/uploads', uploadsRouter)
app.use('/api/admin', adminRouter)
```

- [ ] **Step 6: Verify all routes**

```bash
pnpm type-check
pnpm dev --filter=api
# curl localhost:3001/health
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add upload, user, and admin routes"
```

---

## Phase 5: Frontend

### Task 14: Frontend Foundation (TanStack Query, Auth Client, API)

**Files:**
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/context/auth.tsx` (already rewritten in Task 4, verify)
- Delete: `apps/web/context/index.ts`
- Delete: `apps/web/lib/axios.ts` (renamed to api.ts in Task 4)

- [ ] **Step 1: Install frontend deps**

```bash
cd apps/web
pnpm add @tanstack/react-query @repo/shared@workspace:*
```

- [ ] **Step 2: Verify `apps/web/context/auth.tsx` has Providers with QueryClientProvider**

This was done in Task 4. Verify the file contains the `Providers` component wrapping `QueryClientProvider`.

- [ ] **Step 3: Create query hooks `apps/web/lib/queries/billing.ts`**

```ts
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../api'

export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/api/billing/plans').then((r) => r.data),
  })
}

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.get('/api/billing/subscription').then((r) => r.data),
  })
}

export function useCheckout() {
  return useMutation({
    mutationFn: (params: { planSlug: string; interval: 'monthly' | 'yearly' }) =>
      api.post('/api/billing/checkout', params).then((r) => r.data),
    onSuccess: (data: { checkoutUrl: string }) => {
      window.location.href = data.checkoutUrl
    },
  })
}

export function useInvoices(limit = 20, offset = 0) {
  return useQuery({
    queryKey: ['invoices', limit, offset],
    queryFn: () => api.get(`/api/billing/invoices?limit=${limit}&offset=${offset}`).then((r) => r.data),
  })
}
```

- [ ] **Step 4: Create `apps/web/lib/queries/notifications.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'

export function useNotifications(limit = 20) {
  return useQuery({
    queryKey: ['notifications', limit],
    queryFn: () => api.get(`/api/notifications?limit=${limit}`).then((r) => r.data),
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get('/api/notifications/unread-count').then((r) => r.data.count),
    refetchInterval: 30_000, // poll every 30s
  })
}

export function useMarkAsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.put(`/api/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.put('/api/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add TanStack Query hooks for billing and notifications"
```

---

### Task 15: Auth Pages

**Files:**
- Create: `apps/web/app/(auth)/layout.tsx`
- Create: `apps/web/app/(auth)/login/page.tsx`
- Create: `apps/web/app/(auth)/register/page.tsx`
- Create: `apps/web/app/(auth)/forgot-password/page.tsx`
- Create: `apps/web/app/(auth)/reset-password/page.tsx`
- Create: `apps/web/app/(auth)/verify-email/page.tsx`
- Create: `apps/web/components/auth/login-form.tsx`
- Create: `apps/web/components/auth/register-form.tsx`
- Create: `apps/web/components/auth/auth-guard.tsx`
- Remove: `apps/web/app/login/page.tsx` (old woolf login)
- Remove: `apps/web/app/register/page.tsx` (old woolf register)

- [ ] **Step 1: Remove old auth pages**

Delete `apps/web/app/login/` and `apps/web/app/register/`.

- [ ] **Step 2: Create auth layout**

`apps/web/app/(auth)/layout.tsx`:
```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create login form component**

`apps/web/components/auth/login-form.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn.email({ email, password })
      router.push('/dashboard')
    } catch {
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h1 className="text-2xl font-bold text-center">Sign in</h1>
        <p className="text-sm text-muted-foreground text-center">
          Enter your credentials to access your account
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-sm text-muted-foreground hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Don't have an account? <Link href="/register" className="text-primary hover:underline">Sign up</Link>
        </p>
      </CardFooter>
    </Card>
  )
}
```

- [ ] **Step 4: Create register form, forgot password, reset password, verify email pages**

Follow the same pattern as login form. Each page is a simple form that calls the corresponding Better Auth method:
- Register: `signUp.email({ name, email, password })`
- Forgot password: `authClient.forgetPassword({ email, redirectTo: '/reset-password' })`
- Reset password: `authClient.resetPassword({ newPassword, token })`
- Verify email: reads token from URL params, calls `authClient.verifyEmail({ token })`

Each page file (`apps/web/app/(auth)/*/page.tsx`) imports and renders its form component.

- [ ] **Step 5: Create auth guard**

`apps/web/components/auth/auth-guard.tsx`:
```tsx
'use client'

import { useSession } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/login')
    }
  }, [session, isPending, router])

  if (isPending) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }

  if (!session) return null

  return <>{children}</>
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add auth pages (login, register, forgot/reset password, verify email)"
```

---

### Task 16: App Shell (Sidebar, Topbar, Dashboard)

**Files:**
- Create: `apps/web/app/(app)/layout.tsx`
- Create: `apps/web/app/(app)/dashboard/page.tsx`
- Create: `apps/web/components/layout/app-sidebar.tsx`
- Create: `apps/web/components/layout/app-topbar.tsx`
- Remove: `apps/web/app/dashboard/layout.tsx` (old woolf)
- Remove: `apps/web/app/dashboard/page.tsx` (old woolf)
- Remove: `apps/web/components/layout/navbar.tsx` (old woolf)
- Remove: `apps/web/components/layout/sidebar.tsx` (old woolf)

- [ ] **Step 1: Remove old dashboard layout and components**

Delete:
- `apps/web/app/dashboard/layout.tsx`
- `apps/web/app/dashboard/page.tsx`
- `apps/web/components/layout/navbar.tsx`
- `apps/web/components/layout/sidebar.tsx`

- [ ] **Step 2: Create app sidebar**

`apps/web/components/layout/app-sidebar.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/billing', label: 'Billing', icon: 'CreditCard' },
  { href: '/notifications', label: 'Notifications', icon: 'Bell' },
  { href: '/settings', label: 'Settings', icon: 'Settings' },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-64 border-r bg-background md:block">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="text-lg font-bold">SaaS Kit</Link>
      </div>
      <nav className="space-y-1 p-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              pathname === item.href
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 3: Create app topbar with org switcher and notification bell**

`apps/web/components/layout/app-topbar.tsx`:
```tsx
'use client'

import { useSession, signOut, useListOrganizations, useActiveOrganization } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import { useUnreadCount } from '@/lib/queries/notifications'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function AppTopbar() {
  const { data: session } = useSession()
  const { data: orgs } = useListOrganizations()
  const { data: activeOrg } = useActiveOrganization()
  const { data: unreadCount } = useUnreadCount()
  const router = useRouter()

  function handleOrgSwitch(orgId: string) {
    localStorage.setItem('activeOrganizationId', orgId)
    window.location.reload()
  }

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-4">
        {/* Org switcher */}
        <select
          value={activeOrg?.id || ''}
          onChange={(e) => handleOrgSwitch(e.target.value)}
          className="rounded-md border bg-background px-3 py-1 text-sm"
        >
          {orgs?.map((org: { id: string; name: string }) => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <Link href="/notifications" className="relative">
          <span className="text-sm">Notifications</span>
          {(unreadCount ?? 0) > 0 && (
            <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
              {unreadCount}
            </span>
          )}
        </Link>

        {/* User menu */}
        <span className="text-sm text-muted-foreground">{session?.user?.name}</span>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Create app layout**

`apps/web/app/(app)/layout.tsx`:
```tsx
import { AuthGuard } from '@/components/auth/auth-guard'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppTopbar } from '@/components/layout/app-topbar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <AppTopbar />
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
```

- [ ] **Step 5: Create dashboard skeleton**

`apps/web/app/(app)/dashboard/page.tsx`:
```tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="text-sm font-medium text-muted-foreground">
            Placeholder Metric 1
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">—</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="text-sm font-medium text-muted-foreground">
            Placeholder Metric 2
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">—</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="text-sm font-medium text-muted-foreground">
            Placeholder Metric 3
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">—</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add app shell with sidebar, topbar, org switcher, dashboard skeleton"
```

---

### Task 17: Settings, Billing, and Notification Pages

**Files:**
- Create: `apps/web/app/(app)/settings/page.tsx`
- Create: `apps/web/app/(app)/settings/organization/page.tsx`
- Create: `apps/web/app/(app)/settings/security/page.tsx`
- Create: `apps/web/app/(app)/billing/page.tsx`
- Create: `apps/web/app/(app)/billing/invoices/page.tsx`
- Create: `apps/web/app/(app)/notifications/page.tsx`

- [ ] **Step 1: Create settings pages**

`apps/web/app/(app)/settings/page.tsx` — profile form (name, email, avatar).

`apps/web/app/(app)/settings/organization/page.tsx` — org name, slug, member list with invite button, role badges.

`apps/web/app/(app)/settings/security/page.tsx` — change password form, active sessions list.

Each page uses the corresponding Better Auth client methods:
- Profile: `authClient.updateUser({ name, image })`
- Org: `authClient.organization.update()`, `authClient.organization.inviteMember()`, `authClient.organization.removeMember()`
- Security: `authClient.changePassword()`, `authClient.listSessions()`, `authClient.revokeSession()`

- [ ] **Step 2: Create billing page**

`apps/web/app/(app)/billing/page.tsx` — uses `usePlans()` and `useSubscription()` hooks. Shows current plan, plan comparison cards with upgrade/downgrade CTAs that call `useCheckout()`.

`apps/web/app/(app)/billing/invoices/page.tsx` — uses `useInvoices()` hook. Simple table of past payments.

- [ ] **Step 3: Create notifications page**

`apps/web/app/(app)/notifications/page.tsx` — uses `useNotifications()` and `useMarkAsRead()` hooks. List of notifications with read/unread styling and a "mark all as read" button.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add settings, billing, and notification pages"
```

---

### Task 18: Marketing Pages

**Files:**
- Create: `apps/web/app/(marketing)/layout.tsx`
- Create: `apps/web/app/(marketing)/pricing/page.tsx`
- Create: `apps/web/components/layout/marketing-navbar.tsx`
- Create: `apps/web/components/layout/footer.tsx`
- Modify: `apps/web/app/page.tsx` — move to `(marketing)` route group

- [ ] **Step 1: Create marketing layout components**

`apps/web/components/layout/marketing-navbar.tsx`:
```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function MarketingNavbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <Link href="/" className="text-xl font-bold">SaaS Kit</Link>
      <nav className="flex items-center gap-6">
        <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</Link>
        <Link href="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
        <Link href="/register"><Button size="sm">Get started</Button></Link>
      </nav>
    </header>
  )
}
```

`apps/web/components/layout/footer.tsx`:
```tsx
export function Footer() {
  return (
    <footer className="border-t py-8 px-6">
      <p className="text-sm text-muted-foreground text-center">
        Built with SaaS Kit
      </p>
    </footer>
  )
}
```

- [ ] **Step 2: Create marketing layout**

`apps/web/app/(marketing)/layout.tsx`:
```tsx
import { MarketingNavbar } from '@/components/layout/marketing-navbar'
import { Footer } from '@/components/layout/footer'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNavbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
```

- [ ] **Step 3: Move landing page to `(marketing)` group**

Move `apps/web/app/page.tsx` to `apps/web/app/(marketing)/page.tsx`. Update it to be a functional landing skeleton:

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="flex flex-col items-center justify-center gap-6 py-24 px-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          Your SaaS Product Headline
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          A brief description of what your product does and why people should care.
        </p>
        <div className="flex gap-4">
          <Link href="/register"><Button size="lg">Get started free</Button></Link>
          <Link href="/pricing"><Button variant="outline" size="lg">View pricing</Button></Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t py-16 px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {['Feature 1', 'Feature 2', 'Feature 3'].map((f) => (
              <div key={f} className="rounded-lg border p-6">
                <h3 className="font-semibold mb-2">{f}</h3>
                <p className="text-sm text-muted-foreground">Description of this feature and its value.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t py-16 px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
        <Link href="/register"><Button size="lg">Create your account</Button></Link>
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Create pricing page**

`apps/web/app/(marketing)/pricing/page.tsx` — fetches plans from the public `/api/billing/plans` endpoint and renders plan comparison cards with pricing toggle (monthly/yearly).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add marketing layout, landing page skeleton, pricing page"
```

---

## Phase 6: Deployment and CLI

### Task 19: Dockerfiles and Deployment Config

**Files:**
- Create: `Dockerfile.api`
- Create: `Dockerfile.web`
- Create: `.dockerignore`
- Create: `.github/workflows/ci.yml`
- Modify: `render.yaml` (already updated in Task 1, verify)

- [ ] **Step 1: Create `Dockerfile.api`**

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/shared/package.json ./packages/shared/
COPY packages/payments/package.json ./packages/payments/
COPY packages/email/package.json ./packages/email/
COPY packages/storage/package.json ./packages/storage/
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages ./packages
COPY . .
RUN pnpm --filter=api build

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 appuser
COPY --from=build /app/apps/api/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
USER appuser
EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
```

- [ ] **Step 2: Create `Dockerfile.web`**

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages ./packages
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter=web build

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
ENV PORT=3000 NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
CMD ["node", "apps/web/server.js"]
```

- [ ] **Step 3: Create `.dockerignore`**

```
node_modules
.git
.next
.turbo
dist
*.md
.env*
!.env.example
```

- [ ] **Step 4: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm type-check
      - run: pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Dockerfiles, .dockerignore, CI workflow"
```

---

### Task 20: CLI Scaffolder

**Files:**
- Create: `cli/package.json`
- Create: `cli/tsconfig.json`
- Create: `cli/src/index.ts`
- Create: `cli/src/prompts.ts`
- Create: `cli/src/scaffold.ts`
- Create: `.github/workflows/publish-cli.yml`
- Modify: `pnpm-workspace.yaml` — add cli to workspaces

- [ ] **Step 1: Update pnpm workspace**

Add `cli` to `pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "cli"
```

- [ ] **Step 2: Create `cli/package.json`**

```json
{
  "name": "create-saas-kit",
  "version": "0.1.0",
  "description": "Scaffold a new SaaS project from saas-kit boilerplate",
  "bin": {
    "create-saas-kit": "./dist/index.js"
  },
  "files": [
    "dist",
    "template"
  ],
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@clack/prompts": "^0.9.1"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "tsx": "^4.0.0",
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 3: Create `cli/src/prompts.ts`**

```ts
import * as p from '@clack/prompts'

export interface ScaffoldOptions {
  projectName: string
  paymentProviders: string[]
  defaultPaymentProvider: string
  emailProvider: string
  storageProvider: string
  includeMultiTenancy: boolean
  includeSubscriptions: boolean
}

export async function getOptions(): Promise<ScaffoldOptions> {
  p.intro('create-saas-kit')

  const projectName = await p.text({
    message: 'Project name',
    placeholder: 'my-saas-app',
    validate: (v) => {
      if (!v) return 'Project name is required'
      if (!/^[a-z0-9-]+$/.test(v)) return 'Use lowercase letters, numbers, and hyphens only'
    },
  })
  if (p.isCancel(projectName)) process.exit(0)

  const paymentProviders = await p.multiselect({
    message: 'Select payment gateways',
    options: [
      { value: 'stripe', label: 'Stripe' },
      { value: 'razorpay', label: 'Razorpay' },
      { value: 'cashfree', label: 'Cashfree' },
    ],
    required: true,
  })
  if (p.isCancel(paymentProviders)) process.exit(0)

  const defaultPaymentProvider = await p.select({
    message: 'Default payment gateway',
    options: (paymentProviders as string[]).map((p) => ({ value: p, label: p })),
  })
  if (p.isCancel(defaultPaymentProvider)) process.exit(0)

  const emailProvider = await p.select({
    message: 'Email provider',
    options: [
      { value: 'smtp', label: 'SMTP (Nodemailer)' },
      { value: 'resend', label: 'Resend' },
      { value: 'ses', label: 'AWS SES' },
    ],
  })
  if (p.isCancel(emailProvider)) process.exit(0)

  const storageProvider = await p.select({
    message: 'File storage',
    options: [
      { value: 'cloudinary', label: 'Cloudinary' },
      { value: 's3', label: 'AWS S3' },
      { value: 'gcs', label: 'Google Cloud Storage' },
    ],
  })
  if (p.isCancel(storageProvider)) process.exit(0)

  const includeMultiTenancy = await p.confirm({
    message: 'Include multi-tenancy (organizations)?',
    initialValue: true,
  })
  if (p.isCancel(includeMultiTenancy)) process.exit(0)

  const includeSubscriptions = await p.confirm({
    message: 'Include subscription billing?',
    initialValue: true,
  })
  if (p.isCancel(includeSubscriptions)) process.exit(0)

  return {
    projectName: projectName as string,
    paymentProviders: paymentProviders as string[],
    defaultPaymentProvider: defaultPaymentProvider as string,
    emailProvider: emailProvider as string,
    storageProvider: storageProvider as string,
    includeMultiTenancy: includeMultiTenancy as boolean,
    includeSubscriptions: includeSubscriptions as boolean,
  }
}
```

- [ ] **Step 4: Create `cli/src/scaffold.ts`**

```ts
import * as fs from 'node:fs'
import * as path from 'node:path'
import { execSync } from 'node:child_process'
import type { ScaffoldOptions } from './prompts'

const TEMPLATE_DIR = path.join(__dirname, '..', 'template')

export function scaffold(options: ScaffoldOptions) {
  const targetDir = path.resolve(process.cwd(), options.projectName)

  if (fs.existsSync(targetDir)) {
    throw new Error(`Directory ${options.projectName} already exists`)
  }

  // Copy template
  copyDir(TEMPLATE_DIR, targetDir)

  // Replace project name
  replaceInDir(targetDir, /saas-kit/g, options.projectName)

  // Remove unselected payment adapters
  const allPayments = ['stripe', 'razorpay', 'cashfree']
  for (const p of allPayments) {
    if (!options.paymentProviders.includes(p)) {
      const adapterPath = path.join(targetDir, 'packages', 'payments', 'src', `${p}.ts`)
      if (fs.existsSync(adapterPath)) fs.unlinkSync(adapterPath)
    }
  }

  // Remove unselected email adapters
  const allEmails = ['smtp', 'resend', 'ses']
  for (const e of allEmails) {
    if (e !== options.emailProvider) {
      const adapterPath = path.join(targetDir, 'packages', 'email', 'src', `${e}.ts`)
      if (fs.existsSync(adapterPath)) fs.unlinkSync(adapterPath)
    }
  }

  // Remove unselected storage adapters
  const allStorage = ['cloudinary', 's3', 'gcs']
  for (const s of allStorage) {
    if (s !== options.storageProvider) {
      const adapterPath = path.join(targetDir, 'packages', 'storage', 'src', `${s}.ts`)
      if (fs.existsSync(adapterPath)) fs.unlinkSync(adapterPath)
    }
  }

  // Update .env.example with defaults
  const envPath = path.join(targetDir, 'apps', 'api', '.env.example')
  let envContent = fs.readFileSync(envPath, 'utf-8')
  envContent = envContent.replace(
    /PAYMENT_PROVIDER=.*/,
    `PAYMENT_PROVIDER=${options.defaultPaymentProvider}`,
  )
  envContent = envContent.replace(
    /EMAIL_PROVIDER=.*/,
    `EMAIL_PROVIDER=${options.emailProvider}`,
  )
  envContent = envContent.replace(
    /STORAGE_PROVIDER=.*/,
    `STORAGE_PROVIDER=${options.storageProvider}`,
  )
  fs.writeFileSync(envPath, envContent)

  // Update factory files to only include selected adapters
  updatePaymentFactory(targetDir, options.paymentProviders, options.defaultPaymentProvider)
  updateEmailFactory(targetDir, options.emailProvider)
  updateStorageFactory(targetDir, options.storageProvider)

  // Git init and install
  execSync('git init', { cwd: targetDir, stdio: 'ignore' })
  execSync('pnpm install', { cwd: targetDir, stdio: 'inherit' })
}

function copyDir(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function replaceInDir(dir: string, search: RegExp, replacement: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue
      replaceInDir(fullPath, search, replacement)
    } else if (entry.name.match(/\.(ts|tsx|json|yaml|yml|md|env)$/)) {
      const content = fs.readFileSync(fullPath, 'utf-8')
      const updated = content.replace(search, replacement)
      if (content !== updated) fs.writeFileSync(fullPath, updated)
    }
  }
}

function updatePaymentFactory(dir: string, providers: string[], _defaultProvider: string) {
  const factoryPath = path.join(dir, 'packages', 'payments', 'src', 'index.ts')
  const imports = providers.map((p) => {
    const className = p.charAt(0).toUpperCase() + p.slice(1) + 'Adapter'
    return `import { ${className} } from './${p}'`
  }).join('\n')

  const cases = providers.map((p) => {
    const className = p.charAt(0).toUpperCase() + p.slice(1) + 'Adapter'
    const configMap: Record<string, string> = {
      stripe: `{ secretKey: config.STRIPE_SECRET_KEY!, webhookSecret: config.STRIPE_WEBHOOK_SECRET! }`,
      razorpay: `{ keyId: config.RAZORPAY_KEY_ID!, keySecret: config.RAZORPAY_KEY_SECRET!, webhookSecret: config.RAZORPAY_WEBHOOK_SECRET! }`,
      cashfree: `{ appId: config.CASHFREE_APP_ID!, secretKey: config.CASHFREE_SECRET_KEY!, webhookSecret: config.CASHFREE_WEBHOOK_SECRET!, environment: config.NODE_ENV === 'production' ? 'production' : 'sandbox' }`,
    }
    return `    case '${p}': return new ${className}(${configMap[p]})`
  }).join('\n')

  const content = `import type { PaymentProvider } from './types'
${imports}

export type { PaymentProvider, CreateOrderParams, Order, VerifyPaymentParams, PaymentResult, WebhookEvent, CreateSubscriptionParams, SubscriptionResult } from './types'

export function createPaymentProvider(provider: string, config: Record<string, string>): PaymentProvider {
  switch (provider) {
${cases}
    default: throw new Error(\`Unknown payment provider: \${provider}\`)
  }
}
`
  fs.writeFileSync(factoryPath, content)
}

function updateEmailFactory(_dir: string, _provider: string) {
  // Similar pattern — update factory to only import selected adapter
}

function updateStorageFactory(_dir: string, _provider: string) {
  // Similar pattern — update factory to only import selected adapter
}
```

- [ ] **Step 5: Create `cli/src/index.ts`**

```ts
#!/usr/bin/env node
import * as p from '@clack/prompts'
import { getOptions } from './prompts'
import { scaffold } from './scaffold'

async function main() {
  try {
    const options = await getOptions()

    const s = p.spinner()
    s.start('Scaffolding project...')
    scaffold(options)
    s.stop('Project scaffolded!')

    p.outro(`Done! Next steps:
  cd ${options.projectName}
  cp apps/api/.env.example apps/api/.env
  # Fill in your env vars
  docker compose up -d
  pnpm dev`)
  } catch (error) {
    p.log.error((error as Error).message)
    process.exit(1)
  }
}

main()
```

- [ ] **Step 6: Create template directory**

The template is a snapshot of the boilerplate. Create it by copying the boilerplate (excluding `cli/`, `node_modules/`, `.git/`):

```bash
cd cli
mkdir template
# This will be populated as a build step: copy from repo root into cli/template/
# For now, create a build script in cli/package.json:
```

Add to `cli/package.json`:
```json
{
  "scripts": {
    "build": "tsc && node -e \"const fs=require('fs');const path=require('path');const src=path.join(__dirname,'..');const dest=path.join(__dirname,'template');const ignore=['cli','node_modules','.git','.turbo'];function copy(s,d){fs.mkdirSync(d,{recursive:true});for(const e of fs.readdirSync(s,{withFileTypes:true})){if(ignore.includes(e.name))continue;const sp=path.join(s,e.name);const dp=path.join(d,e.name);e.isDirectory()?copy(sp,dp):fs.copyFileSync(sp,dp)}}copy(src,dest)\""
  }
}
```

- [ ] **Step 7: Create `.github/workflows/publish-cli.yml`**

```yaml
name: Publish CLI

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install --frozen-lockfile
      - run: cd cli && pnpm build
      - run: cd cli && npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 8: Verify CLI locally**

```bash
cd cli
pnpm build
node dist/index.js
# Should show the interactive prompts
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add CLI scaffolder (create-saas-kit)"
```

---

### Task 21: Final Cleanup and CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`
- Delete: `COMMITS.md`

- [ ] **Step 1: Rewrite `CLAUDE.md`**

Update to reflect the new boilerplate structure, commands, architecture. Remove all references to DocBook, woolf, healthcare, capstone requirements.

- [ ] **Step 2: Update `README.md`**

Replace with a concise README covering:
- What this is (SaaS boilerplate)
- Quick start (clone, install, dev)
- Architecture overview
- Adapter system
- CLI scaffolder usage

- [ ] **Step 3: Remove `COMMITS.md`**

Delete the woolf-specific commits tracking file.

- [ ] **Step 4: Final verification**

```bash
pnpm install
pnpm lint
pnpm type-check
pnpm build
docker compose up -d
pnpm dev
# Test: landing page at localhost:3000
# Test: API health at localhost:3001/health
# Test: auth flow (register, login)
# Test: dashboard loads after login
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: update CLAUDE.md and README for saas-kit boilerplate"
```
