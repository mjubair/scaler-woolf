# Evaluator Guide

A quick guide to logging in, running the project, and exercising the main flows.

## Try the live deployment (easiest)

- **Web**: https://scaler-woolf-web.vercel.app
- **API**: https://woolf-api.onrender.com (free tier — first request after idle takes ~30s to wake, so the initial login may be slow)

## Demo credentials

All seeded accounts share the password **`password123`**.

| Role | Email |
|---|---|
| Admin | `admin@docbook.com` |
| Patient | `rahul@example.com`, `priya@example.com`, `amit@example.com`, `sneha@example.com`, `vikram@example.com` |
| Doctor (approved) | `ananya@docbook.com`, `rajesh@docbook.com`, `fatima@docbook.com`, `suresh@docbook.com`, `meera@docbook.com`, `arjun@docbook.com` |
| Doctor (pending approval) | `kavitha@docbook.com`, `mohammed@docbook.com` |

### Register with your own email to receive notifications

The seeded accounts use placeholder email addresses, so booking-related emails won't reach you. To experience the **email notification flow** end-to-end, sign up at `/register` using a real email address you control. Pick the **Patient** or **Doctor** role; you'll then receive confirmation, reminder, and prescription emails for any appointments tied to that account.

## Test payment cards (Razorpay)

Payments run on Razorpay's **test mode**, so no real money moves. When you reach the payment step in the booking flow, use any of the cards below. For all cards: enter **any random 3-digit CVV** (4-digit for Amex) and **any future expiry date**.

| Network | Card Number |
|---|---|
| Visa | `4100 2800 0000 1007` |
| Mastercard | `5500 6700 0000 1002` |
| RuPay | `6527 6589 0000 1005` |
| Diners | `3608 280009 1007` |
| Amex | `3402 560004 01007` |

## Run locally

```bash
# 1. Prereqs: Node.js 20+, pnpm, Docker
pnpm install

# 2. Start PostgreSQL (Docker, port 5433)
docker compose up -d

# 3. Configure env files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# Edit apps/api/.env — at minimum set JWT_SECRET. DATABASE_URL default works with Docker Compose.

# 4. Migrate + seed
pnpm --filter=api db:migrate
pnpm --filter=api db:seed

# 5. Run both apps
pnpm dev
# Web → http://localhost:3000   API → http://localhost:3001
```

## Required env vars (minimum to boot)

In `apps/api/.env`: `DATABASE_URL` and `JWT_SECRET`. The app starts without the rest, but the features below will be inactive.

## Optional third-party services (graceful degradation)

| Service | Env vars | What breaks without it |
|---|---|---|
| Razorpay | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Payment step in booking flow |
| Google Calendar / Meet | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Auto Meet link on appointment confirmation |
| Cloudinary | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Patient attachment uploads |
| SMTP (Gmail) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL` | Email notifications (use a Gmail App Password) |

Login, browsing doctors, booking (without payment), reviews, and prescriptions all work without these.

## Suggested demo path

1. Log in as `rahul@example.com` → see existing appointments, prescriptions, and medical history.
2. Search a doctor → book a new slot → step through the booking flow.
3. Log in as `ananya@docbook.com` → view today's appointments, write a prescription, view reviews.
4. Log in as `admin@docbook.com` → approve a pending doctor (`kavitha@docbook.com` or `mohammed@docbook.com`).
5. Register a new account with your own email → book an appointment → confirm that notification emails arrive in your inbox.
