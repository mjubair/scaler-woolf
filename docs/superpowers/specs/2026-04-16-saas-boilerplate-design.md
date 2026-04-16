# SaaS Boilerplate Design Spec

> Personal starter kit for spinning up SaaS products fast. Fork woolf, strip healthcare-specific code, generalize into a reusable boilerplate with adapter-based integrations.

## Approach

**Fork & Generalize Woolf** — copy woolf into a new repo (fresh git history, not a GitHub fork), keep the proven monorepo structure, config, and tooling. Remove all DocBook/healthcare-specific code. Replace hand-rolled auth with Better Auth. Add adapter-based payments, email, and storage. Add multi-tenancy and subscriptions.

**Repo name:** `saas-kit` (working name, rename as needed).
**CLI package name:** `create-saas-kit` (working name, configurable before first npm publish).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + pnpm |
| API | Express.js + TypeScript |
| Frontend | Next.js 16 + React 19 |
| Database | Drizzle ORM + PostgreSQL |
| Auth | Better Auth (email/password, OAuth-ready, sessions, org plugin) |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Data Fetching | TanStack Query |
| Logging | Pino (structured JSON, pino-pretty in dev) |
| Validation | Zod (env vars + API input) |
| Lint/Format | Biome (2-space indent, single quotes, no semicolons, line width 100) |

---

## Monorepo Structure

```
saas-kit/
├── apps/
│   ├── api/                  Express.js REST API (port 3001)
│   └── web/                  Next.js 16 frontend (port 3000)
├── packages/
│   ├── typescript-config/    Shared tsconfig base
│   ├── payments/             Payment adapter (Stripe, Razorpay, Cashfree)
│   ├── email/                Email adapter (SMTP, Resend, SES)
│   ├── storage/              File storage adapter (Cloudinary, S3, GCS)
│   └── shared/               Shared types, constants, utils
├── cli/                      CLI scaffolder (create-my-saas)
├── docker-compose.yml        Local dev (Postgres)
├── render.yaml               Render deployment config
├── turbo.json
├── biome.json
├── pnpm-workspace.yaml
├── .github/
│   └── workflows/
│       ├── ci.yml            On PR: lint, type-check, build
│       └── publish-cli.yml   On tag: npm publish CLI
└── package.json
```

### What Gets Removed from Woolf

- All healthcare-specific schema tables (doctors, appointments, prescriptions, medical history, reviews, availability slots, attachments)
- All healthcare-specific routes, services, and frontend pages
- Razorpay direct integration (replaced by payments adapter)
- Cloudinary direct integration (replaced by storage adapter)
- Nodemailer direct usage (replaced by email adapter)
- Google Calendar/Meet integration
- Hand-rolled JWT auth (replaced by Better Auth)

---

## Adapter System

All three adapters follow the same pattern: provider interface + adapter implementations + factory function. The active adapter is selected via environment variable at startup.

### Payments (`packages/payments`)

```
packages/payments/src/
├── index.ts          createPaymentProvider() factory
├── types.ts          PaymentProvider interface
├── stripe.ts         StripeAdapter
├── razorpay.ts       RazorpayAdapter
└── cashfree.ts       CashfreeAdapter
```

**PaymentProvider interface:**

```ts
interface PaymentProvider {
  createOrder(params: CreateOrderParams): Promise<Order>
  verifyPayment(params: VerifyParams): Promise<PaymentResult>
  handleWebhook(payload: unknown, signature: string): Promise<WebhookEvent>
  createSubscription(params: SubscriptionParams): Promise<Subscription>
  cancelSubscription(id: string): Promise<void>
  getPaymentStatus(id: string): Promise<PaymentStatus>
}
```

- Selected via `PAYMENT_PROVIDER=stripe|razorpay|cashfree` env var
- Webhook normalization: each adapter normalizes gateway-specific payloads into a common `WebhookEvent` type
- Subscription support built in for flat plan billing

### Email (`packages/email`)

```
packages/email/src/
├── index.ts          createEmailProvider() factory
├── types.ts          EmailProvider interface
├── smtp.ts           SmtpAdapter (Nodemailer)
├── resend.ts         ResendAdapter
└── ses.ts            SesAdapter
```

**EmailProvider interface:**

```ts
interface EmailProvider {
  send(params: SendEmailParams): Promise<void>
  sendTemplate(template: string, params: TemplateParams): Promise<void>
  sendBatch(emails: SendEmailParams[]): Promise<void>
}
```

- Selected via `EMAIL_PROVIDER=smtp|resend|ses` env var
- Templates are functions returning `{ subject, html, text }` — no heavy templating engine

**Bundled email templates:** welcome, email verification, password reset, org invitation, payment receipt, subscription activated, subscription cancelled, payment failed.

### Storage (`packages/storage`)

```
packages/storage/src/
├── index.ts          createStorageProvider() factory
├── types.ts          StorageProvider interface
├── cloudinary.ts     CloudinaryAdapter
├── s3.ts             S3Adapter
└── gcs.ts            GcsAdapter
```

**StorageProvider interface:**

```ts
interface StorageProvider {
  upload(file: Buffer, options: UploadOptions): Promise<UploadResult>
  delete(fileId: string): Promise<void>
  getSignedUrl(fileId: string, expiresIn?: number): Promise<string>
}
```

- Selected via `STORAGE_PROVIDER=cloudinary|s3|gcs` env var

### Adapter Usage

Providers are created once at API startup:

```ts
// apps/api/src/index.ts
const payments = createPaymentProvider()
const email = createEmailProvider()
const storage = createStorageProvider()
```

Injected into routes via simple import. Route handlers never touch provider-specific APIs directly.

---

## Authentication (Better Auth)

Replaces woolf's hand-rolled JWT + bcrypt.

### Server Setup (`apps/api/src/auth.ts`)

```ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization } from 'better-auth/plugins'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  plugins: [
    organization()   // multi-tenancy: orgs, members, roles
  ],
})
```

- Mounted on `/api/auth/*`
- Better Auth handles all auth routes (register, login, logout, verify email, reset password)
- Session-based auth with httpOnly secure cookies (not localStorage JWT)

### Client Setup (`apps/web/lib/auth-client.ts`)

```ts
import { createAuthClient } from 'better-auth/react'
import { organizationClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  plugins: [organizationClient()],
})

export const { useSession, signIn, signUp, signOut } = authClient
```

### Custom Middleware

- `requireAuth()` — validates Better Auth session, attaches user to request
- `requireRole(...roles)` — checks user's role within the active organization (owner/admin/member)

### What Changes from Woolf

| Woolf | Boilerplate |
|---|---|
| JWT (7-day expiry) | Better Auth sessions (DB-backed) |
| bcrypt manual hashing | Better Auth handles hashing |
| Bearer token in localStorage | httpOnly secure cookies |
| Custom auth routes | Better Auth handles `/api/auth/*` |
| React context calling `/auth/me` | `useSession()` hook |

---

## Database Schema

### Better Auth Managed Tables

```
user              id, name, email, emailVerified, image, role, createdAt, updatedAt
session           id, userId*, token, expiresAt, ipAddress, userAgent, createdAt
account           id, userId*, accountId, providerId, accessToken, refreshToken, expiresAt
verification      id, identifier, value, expiresAt, createdAt
```

### Better Auth Organization Plugin Tables

```
organization      id, name, slug, logo, metadata, createdAt
member            id, userId*, organizationId*, role (owner|admin|member), createdAt
invitation        id, email, organizationId*, role, status, inviterId*, expiresAt, createdAt
```

### Custom Billing Tables

```
plan              id, name, slug, description, monthlyPrice, yearlyPrice, currency,
                  features (JSONB), limits (JSONB), isActive, sortOrder, createdAt

subscription      id, organizationId*, planId*, status (active|cancelled|past_due|trialing),
                  currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd,
                  providerSubscriptionId, providerData (JSONB), createdAt, updatedAt

payment           id, organizationId*, subscriptionId*, amount, currency,
                  status (created|paid|failed|refunded),
                  providerPaymentId, providerData (JSONB), createdAt
```

### Custom App Tables

```
notification      id, userId*, organizationId*, type, title, message, isRead,
                  metadata (JSONB), createdAt

file_upload       id, userId*, organizationId*, fileName, fileType, fileSize,
                  providerUrl, providerId, createdAt
```

### Key Decisions

- **Billing is org-scoped** — subscriptions belong to organizations, not users
- **`providerData` JSONB** — stores raw gateway-specific data for debugging, adapter normalizes for app code
- **`plan.features` and `plan.limits` as JSONB** — flexible per-project (e.g., `{ "maxMembers": 5, "maxStorage": "10GB" }`)
- **Prices in smallest currency unit** — cents/paise, no floating point
- **Everything tenant-scoped** — notifications, files, payments all have `organizationId`

---

## Multi-Tenancy

Shared database with tenant column. Powered by Better Auth's organization plugin.

### Flow

```
User signs up → Creates an organization (auto-created personal org)
             → All data scoped by organizationId
             → Can create/join multiple orgs
             → Switching orgs switches tenant context
```

### Tenant Middleware

```ts
// Extracts organizationId from X-Organization-Id header
// Validates user is a member of that org
// Attaches organizationId to req
// All downstream queries filter by req.organizationId
```

### Frontend Tenant Context

```ts
// Axios interceptor sends X-Organization-Id header with every request
// Set when user selects/switches organization via org switcher component
```

### Organization Lifecycle

- **Sign up** — auto-creates personal org
- **Create org** — user becomes owner
- **Invite member** — email invite, creates invitation row
- **Accept invite** — creates member row
- **Switch org** — frontend updates active org, all API calls re-scoped
- **Leave org** — removes member row

### Roles

- **owner** — full control, billing, can delete org
- **admin** — manage members and settings
- **member** — use the product

### Plan Enforcement Middleware

Checks org's active plan limits before allowing actions (e.g., max members, max storage). Limits defined in `plan.limits` JSONB.

---

## Subscription & Billing

### Plan Structure

Three seeded plans: Free, Pro, Enterprise. Prices in smallest currency unit. Features and limits as JSONB for per-project flexibility.

### Checkout Flow

1. User clicks "Upgrade to Pro"
2. `POST /api/billing/checkout` — creates checkout session via payment adapter
3. Redirect to payment gateway checkout page
4. User completes payment
5. Gateway sends webhook to `POST /api/billing/webhook`
6. Adapter normalizes webhook, updates subscription in DB
7. Confirmation email + in-app notification sent

### Billing Routes

| Route | Purpose |
|---|---|
| `GET /api/billing/plans` | List available plans |
| `POST /api/billing/checkout` | Create checkout session |
| `POST /api/billing/webhook` | Handle payment webhooks |
| `GET /api/billing/subscription` | Get org's current subscription |
| `POST /api/billing/cancel` | Cancel at period end |
| `POST /api/billing/resume` | Resume cancelled subscription |
| `GET /api/billing/invoices` | Payment history |
| `POST /api/billing/portal` | Gateway billing portal redirect |

### Industry Standards

- Webhook idempotency — deduplicate by `providerPaymentId`
- Webhook signature verification on every adapter
- Gateway is source of truth, DB is a cache
- Graceful downgrades — access continues until `currentPeriodEnd`

---

## Frontend Architecture

### Page Structure

```
apps/web/app/
├── (marketing)/                Public pages
│   ├── page.tsx                Landing page skeleton
│   ├── pricing/page.tsx        Plan comparison
│   └── layout.tsx              Marketing navbar + footer
│
├── (auth)/                     Auth pages (redirect if logged in)
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── forgot-password/page.tsx
│   ├── reset-password/page.tsx
│   ├── verify-email/page.tsx
│   └── layout.tsx              Centered card layout
│
├── (app)/                      Protected pages (auth required)
│   ├── dashboard/page.tsx      Main dashboard skeleton
│   ├── settings/
│   │   ├── page.tsx            Account settings
│   │   ├── organization/page.tsx   Org settings, members
│   │   └── security/page.tsx       Password, sessions
│   ├── billing/
│   │   ├── page.tsx            Current plan, upgrade/downgrade
│   │   └── invoices/page.tsx   Payment history
│   ├── notifications/page.tsx
│   └── layout.tsx              Sidebar + topbar + org switcher
│
└── layout.tsx                  Root: fonts, providers, metadata
```

### Route Groups

- `(marketing)` — public, marketing navbar, no sidebar
- `(auth)` — public, minimal layout, redirects to dashboard if logged in
- `(app)` — protected, sidebar layout, redirects to login if not authenticated

### Key Components

```
components/
├── ui/                         shadcn/ui primitives
├── layout/
│   ├── marketing-navbar.tsx
│   ├── app-sidebar.tsx         Collapsible sidebar
│   ├── app-topbar.tsx          Org switcher + notifications + user menu
│   └── footer.tsx
├── auth/
│   ├── login-form.tsx
│   ├── register-form.tsx
│   └── auth-guard.tsx
├── billing/
│   ├── plan-card.tsx
│   ├── plan-comparison.tsx
│   └── invoice-table.tsx
├── settings/
│   ├── profile-form.tsx
│   ├── org-form.tsx
│   └── member-table.tsx
└── notifications/
    ├── notification-bell.tsx
    └── notification-list.tsx
```

### Data Fetching

TanStack Query for all client-side data fetching. Provides caching, deduplication, background refetching, and optimistic updates.

### Styling

- Tailwind CSS 4 with OKLCH color space
- CSS custom properties for theming
- Dark mode via `dark:` variant + theme toggle
- shadcn/ui components as the primitive layer

---

## API Structure

### Routes

| Route group | Endpoints |
|---|---|
| `/api/auth/*` | Better Auth handles all auth routes |
| `/api/users` | `GET /me`, `PUT /me` (profile) |
| `/api/organizations` | CRUD orgs, manage members, invitations |
| `/api/billing` | Plans, checkout, webhooks, subscription, invoices |
| `/api/uploads` | Upload files, list files, delete files |
| `/api/notifications` | List notifications, mark as read |
| `/api/admin` | User stats, org management (admin role only) |
| `/health` | Health check (DB connectivity) |

### Middleware Stack

1. **Helmet** — security headers
2. **CORS** — scoped to `ALLOWED_ORIGINS`
3. **Rate limiting** — 200 req/15min global, 10 req/15min on auth
4. **Pino HTTP** — request logging
5. **Better Auth session** — on `/api/auth/*`
6. **requireAuth** — validates session on protected routes
7. **requireTenant** — extracts and validates `X-Organization-Id`
8. **requireRole** — checks org membership role
9. **Zod validation** — input validation on request bodies

### Services Layer

Business logic separated from routes:
- `billing.service.ts` — plan management, subscription lifecycle
- `notification.service.ts` — create/list notifications
- `upload.service.ts` — file upload orchestration via storage adapter
- `organization.service.ts` — org operations beyond Better Auth basics (plan enforcement, etc.)

### Industry Standards

- Input validation with Zod on all routes
- Structured error responses with consistent format
- Env validation at startup (fail fast)
- Graceful shutdown (SIGTERM handler)
- Health check endpoint for load balancers

---

## Notifications

### In-App

- Bell icon in topbar with unread count badge
- Dropdown panel listing recent notifications
- Mark as read (individual + mark all)
- `GET /api/notifications` with pagination
- `PUT /api/notifications/:id/read`

### Email

Triggered alongside in-app notifications for important events:
- Welcome, verification, password reset
- Org invitation
- Payment receipt, subscription changes, payment failures

Sent via email adapter. Templates are functions returning `{ subject, html, text }`.

---

## Deployment

### Local Development

```bash
docker compose up -d    # Postgres
pnpm dev                # API on :3001, Web on :3000
```

### Production

- **API** — Render Web Service (auto-deploys from main)
- **Database** — Render PostgreSQL
- **Web** — Vercel (auto-deploys from main)

Redis can be added later if needed (multi-instance rate limiting, job queues, real-time features). For v1, in-memory rate limiting and DB-backed sessions are sufficient.

`render.yaml` and Vercel auto-deploy handle everything. No CI/CD config needed for deploys.

### GitHub Actions

- `ci.yml` — on PR: lint, type-check, build
- `publish-cli.yml` — on tag push: npm publish CLI

### Dockerfiles

- `Dockerfile.api` — multi-stage build, non-root user, production-only deps
- `Dockerfile.web` — multi-stage Next.js standalone build
- `.dockerignore` — excludes node_modules, .git, .env

Dockerfiles included for portability. If you outgrow Render, deploy containers anywhere.

---

## CLI Scaffolder

### Usage

```bash
npx create-my-saas my-app
```

### Prompts

- Project name
- Payment gateways (multi-select: Stripe, Razorpay, Cashfree)
- Default payment gateway
- Email provider (SMTP, Resend, SES)
- File storage (Cloudinary, S3, GCS)
- Include multi-tenancy (yes/no)
- Include subscriptions (yes/no)

### What It Does

1. Copies boilerplate from bundled template
2. Replaces project name references
3. Removes unselected adapter implementations
4. Removes unselected features (multi-tenancy tables, billing routes, etc.)
5. Generates `.env.example` with only relevant env vars
6. Runs `git init` and `pnpm install`

### Built With

- **clack** — interactive prompts (create-t3-app style UI)
- Plain Node.js `fs` — file copying and transformation
- Published to npm as `create-saas-kit` (or custom name)

### Publishing

- Template files bundled inside the npm package
- GitHub Action auto-publishes on git tag push
- `npx` always fetches latest published version

---

## Environment Variables

```bash
# Core
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://...
ALLOWED_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Better Auth
BETTER_AUTH_SECRET=...

# Adapters
PAYMENT_PROVIDER=stripe        # stripe | razorpay | cashfree
EMAIL_PROVIDER=smtp            # smtp | resend | ses
STORAGE_PROVIDER=cloudinary    # cloudinary | s3 | gcs

# Stripe (if selected)
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PUBLISHABLE_KEY=...

# Razorpay (if selected)
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# Cashfree (if selected)
CASHFREE_APP_ID=...
CASHFREE_SECRET_KEY=...
CASHFREE_WEBHOOK_SECRET=...

# SMTP (if selected)
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
FROM_EMAIL=...

# Resend (if selected)
RESEND_API_KEY=...
FROM_EMAIL=...

# SES (if selected)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=...
FROM_EMAIL=...

# Cloudinary (if selected)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# S3 (if selected)
S3_BUCKET=...
S3_REGION=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# GCS (if selected)
GCS_BUCKET=...
GCS_PROJECT_ID=...
GCS_KEY_FILE=...

# Logging
LOG_LEVEL=info
```

Validated at startup with Zod. App crashes immediately if required vars are missing.
