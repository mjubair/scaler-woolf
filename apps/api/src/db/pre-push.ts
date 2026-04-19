import 'dotenv/config'
import postgres from 'postgres'

// Run before `drizzle-kit push` to drop legacy tables that aren't in schema.ts.
// Without this, drizzle-kit prompts interactively ("rename posts -> appointment_attachments?")
// and blocks the CI build since its prompts use raw TTY (can't be answered via pipe).

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')

  const sql = postgres(url, { max: 1 })
  try {
    await sql`DROP TABLE IF EXISTS "posts" CASCADE`
    console.log('[pre-push] Dropped legacy posts table (if it existed)')
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error('[pre-push] Failed:', err)
  process.exit(1)
})
