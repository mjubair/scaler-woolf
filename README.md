# DocBook — Healthcare Appointment Booking Platform

A production-ready fullstack healthcare booking platform built as a Master of Science in Computer Science capstone project at Scaler Neovarsity – Woolf. Patients can discover verified doctors, book appointments, pay securely via Razorpay, and attend consultations over Google Meet. Doctors manage availability, conduct consultations, and issue digital prescriptions. Admins approve doctors and oversee platform activity.

Live API: https://woolf-api.onrender.com  
Repository: https://github.com/mjubair/scaler-woolf

## What's inside?

A Turborepo monorepo with a Next.js 16 frontend, an Express.js API backend, and a shared TypeScript configuration package.

### Apps

- `apps/api` — Express.js 4 REST API (TypeScript, port 3001). Drizzle ORM + PostgreSQL. JWT auth. Razorpay payments. Google Calendar + Meet. Nodemailer SMTP. Cloudinary uploads.
- `apps/web` — Next.js 16 frontend (React 19, App Router, port 3000). Tailwind CSS v4 + shadcn/ui. Role-based dashboards for patient / doctor / admin.

### Packages

- `packages/typescript-config` — Shared TypeScript base configuration.

### Tools

- [Turborepo](https://turborepo.dev) — Build orchestration and caching
- [Biome](https://biomejs.dev) — Linter and formatter
- [TypeScript](https://www.typescriptlang.org) — Type safety
- [pnpm](https://pnpm.io) — Package manager
- [Drizzle ORM](https://orm.drizzle.team) — Type-safe database layer
- [Docker](https://www.docker.com) — Local PostgreSQL container

## Project Structure

```
woolf/
├── apps/
│   ├── api/                           Express.js REST API
│   │   ├── drizzle/                   Database migrations (SQL + metadata)
│   │   ├── src/
│   │   │   ├── index.ts               Server entry — middleware + route mounts
│   │   │   ├── db/
│   │   │   │   ├── index.ts           Drizzle client + PostgreSQL connection
│   │   │   │   ├── schema.ts          Schema (8 tables, 4 enums)
│   │   │   │   ├── seed.ts            Seed script for demo data
│   │   │   │   └── seed-more-doctors.ts
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts            JWT validation + role-based authorization
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts            Login, signup
│   │   │   │   ├── doctors.ts         Doctor profiles, search, availability
│   │   │   │   ├── appointments.ts    Booking, status, cancellation
│   │   │   │   ├── payments.ts        Razorpay order + verify + webhook
│   │   │   │   ├── calendar.ts        Google Calendar OAuth + event creation
│   │   │   │   ├── reviews.ts         Patient reviews and ratings
│   │   │   │   ├── prescriptions.ts   Digital prescriptions
│   │   │   │   ├── patients.ts        Patient profile
│   │   │   │   ├── notifications.ts   In-app notifications
│   │   │   │   ├── admin.ts           Admin operations
│   │   │   │   └── attachments.ts     File uploads (Cloudinary)
│   │   │   └── services/
│   │   │       ├── appointment.service.ts
│   │   │       ├── calendar.service.ts
│   │   │       ├── doctor.service.ts
│   │   │       ├── email.service.ts
│   │   │       ├── notification.service.ts
│   │   │       ├── payment.service.ts
│   │   │       └── upload.service.ts
│   │   ├── drizzle.config.ts
│   │   ├── requests.rest              Manual API request collection
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                           Next.js 16 frontend
│       ├── app/
│       │   ├── page.tsx               Landing page
│       │   ├── layout.tsx             Root layout with providers
│       │   ├── login/                 Login page
│       │   ├── register/              Registration with role selection
│       │   ├── doctors/               Doctor directory (search / filter)
│       │   ├── booking/[doctorId]/    Multi-step booking flow
│       │   └── dashboard/
│       │       ├── patient/           Patient dashboard + sub-routes
│       │       │   ├── appointments/
│       │       │   ├── prescriptions/
│       │       │   ├── medical-history/
│       │       │   └── profile/
│       │       ├── doctor/            Doctor dashboard + sub-routes
│       │       │   ├── appointments/
│       │       │   ├── availability/
│       │       │   ├── consultation/[id]/
│       │       │   ├── prescriptions/
│       │       │   ├── profile/
│       │       │   └── reviews/
│       │       └── admin/             Admin dashboard + sub-routes
│       │           ├── doctors/
│       │           ├── patients/
│       │           └── appointments/
│       ├── components/
│       │   ├── ui/                    shadcn/ui components
│       │   └── layout/                Navbar, Sidebar, DoctorSearch
│       ├── context/
│       │   └── auth.tsx               Auth context (JWT + localStorage)
│       ├── lib/
│       │   └── axios.ts               Axios instance with baseURL
│       ├── public/                    Static assets
│       ├── next.config.ts
│       ├── postcss.config.mjs
│       ├── components.json            shadcn/ui registry config
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── typescript-config/             Shared tsconfig base
│
├── resources/                         Project report + submission assets
├── docs/                              Additional documentation
├── docker-compose.yml                 Local PostgreSQL (port 5433)
├── turbo.json                         Turborepo pipeline
├── biome.json                         Linter + formatter config
├── pnpm-workspace.yaml                pnpm workspace definition
├── render.yaml                        Render deployment config
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20+ and pnpm
- Docker (for local PostgreSQL)

### Installation

```bash
pnpm install
```

### Local database

Start PostgreSQL via Docker (exposed on port 5433):

```bash
docker compose up -d
```

Then configure `apps/api/.env` with `DATABASE_URL`, `JWT_SECRET`, Razorpay keys, Google OAuth credentials, SMTP credentials, and Cloudinary credentials. See `apps/api/README.md` for the full variable list.

Apply migrations and seed demo data:

```bash
pnpm --filter=api db:migrate
pnpm --filter=api db:seed
```

### Development

Run all apps in development mode:

```bash
pnpm dev
```

Web runs at http://localhost:3000 and API at http://localhost:3001.

### Build

Build all apps:

```bash
pnpm build
```

### Lint

Lint and format all packages:

```bash
pnpm lint
pnpm check
```

## Useful Commands

- `pnpm dev` - Start all apps in development mode
- `pnpm build` - Build all apps
- `pnpm start` - Start all apps in production mode
- `pnpm lint` - Lint all packages
- `pnpm type-check` - Type check all packages
- `pnpm format` - Format all files with Biome
- `pnpm check` - Check and fix with Biome
- `pnpm clean` - Clean all build artifacts

### Turborepo Filtering

Run commands for specific packages:

```bash
pnpm dev --filter=web       # Run only web app
pnpm build --filter=api     # Build only api app
pnpm lint --filter=...web   # Lint web and its dependencies
```

## Deployment

| Service | Platform | URL |
|---|---|---|
| API | Render | https://woolf-api.onrender.com |
| Database | Render PostgreSQL | Internal (via `DATABASE_URL`) |
| Web | Vercel | See Vercel dashboard |

Render runs migrations automatically on every deploy via `pnpm --filter=api db:migrate`. The `ALLOWED_ORIGINS` env var on Render must include the Vercel frontend URL for CORS to work.

## Learn More

- [Turborepo Documentation](https://turborepo.dev/docs)
- [Biome Documentation](https://biomejs.dev)
- [Next.js 16 Documentation](https://nextjs.org/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Razorpay Integration Docs](https://razorpay.com/docs)
