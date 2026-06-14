import { env } from '@chorala/config'
import { db, schema } from '@chorala/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

/**
 * Better Auth for the dashboard. Same secret + DB + cookie scheme as apps/api, so the
 * session cookie set by the API's sign-in (same host, idea.2pu.net) is read here too.
 * basePath under /api/v1/auth matches the API; the dashboard only ever READS the session.
 */
export const auth = betterAuth({
  secret: env.CHORALA_AUTH_SECRET,
  baseURL: env.CHORALA_PUBLIC_URL,
  basePath: '/api/v1/auth',
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: { enabled: true },
  advanced: { useSecureCookies: env.CHORALA_PUBLIC_URL.startsWith('https://') },
})
