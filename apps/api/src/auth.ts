import { env } from '@heed/config'
import { db, schema } from '@heed/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {}
if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
  }
}
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  }
}

/** Better Auth — admin (dashboard) authentication. Maps to our plural Drizzle tables. */
export const auth = betterAuth({
  secret: env.HEED_AUTH_SECRET,
  baseURL: env.HEED_API_URL,
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
  emailAndPassword: { enabled: true, autoSignIn: true },
  trustedOrigins: [env.HEED_PUBLIC_URL, env.HEED_API_URL],
  socialProviders,
})

export type Auth = typeof auth
