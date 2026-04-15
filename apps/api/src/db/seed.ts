import 'dotenv/config'
import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'
import { db } from './index'
import { users } from './schema'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@docbook.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456'
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin'

async function seed() {
  console.log('Seeding admin user...')

  // Check if admin already exists
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))

  if (existing.length > 0) {
    console.log(`Admin user already exists (${ADMIN_EMAIL})`)
    process.exit(0)
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)

  const [admin] = await db
    .insert(users)
    .values({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash,
      role: 'admin',
      isActive: true,
      isVerified: true,
    })
    .returning({ id: users.id, email: users.email, role: users.role })

  console.log(`Admin user created: ${admin!.email} (id: ${admin!.id})`)
  console.log(`Login with: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
