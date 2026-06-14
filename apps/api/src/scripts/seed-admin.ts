import { db, eq, members, SEED_ADMIN, users } from '@chorala/db'
import { auth } from '../auth.ts'

/**
 * Turns the Phase-1 seeded admin into a real Better Auth credential.
 * The Phase-1 seed inserts the admin `user` + `member(owner)` rows but no password
 * (Better Auth's hasher isn't available there). Here we recreate the user via Better
 * Auth's sign-up API (so the credential is valid), preserving org memberships.
 */
async function main() {
  const [existing] = await db.select().from(users).where(eq(users.email, SEED_ADMIN.email))

  let memberships: { orgId: string; role: 'owner' | 'admin' | 'member' }[] = []
  if (existing) {
    const rows = await db.select().from(members).where(eq(members.userId, existing.id))
    memberships = rows.map((m) => ({ orgId: m.orgId, role: m.role }))
    // Cascades the member rows; we recreate them against the new auth user below.
    await db.delete(users).where(eq(users.id, existing.id))
  }

  const result = await auth.api.signUpEmail({
    body: { email: SEED_ADMIN.email, password: SEED_ADMIN.password, name: SEED_ADMIN.name },
  })
  const newUserId = result.user.id

  for (const m of memberships) {
    await db.insert(members).values({ orgId: m.orgId, userId: newUserId, role: m.role })
  }

  console.log(`✓ admin credential ready: ${SEED_ADMIN.email} / ${SEED_ADMIN.password}`)
  console.log(`  user: ${newUserId}, memberships restored: ${memberships.length}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('✗ seed-admin failed:', err)
  process.exit(1)
})
