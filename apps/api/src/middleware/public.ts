import { env } from '@heed/config'
import { AppError, projects, unauthorized } from '@heed/core'
import type { Context, MiddlewareHandler } from 'hono'
import { redis } from '../lib/redis.ts'
import type { PublicEnv, PublicProject } from '../types.ts'

const RATE_WINDOW_SEC = 60

function clientIp(c: Context): string {
  const fwd = c.req.header('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]?.trim() || 'unknown'
  return c.req.header('x-real-ip') || 'local'
}

async function enforceRateLimit(c: Context, projectId: string) {
  const limit = env.HEED_RATE_LIMIT_PUBLIC
  const window = Math.floor(Date.now() / 1000 / RATE_WINDOW_SEC)
  const key = `rl:${projectId}:${clientIp(c)}:${window}`
  try {
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, RATE_WINDOW_SEC)
    c.header('X-RateLimit-Limit', String(limit))
    c.header('X-RateLimit-Remaining', String(Math.max(0, limit - count)))
    if (count > limit) throw new AppError('rate_limited', 'Rate limit exceeded', 429)
  } catch (err) {
    if (err instanceof AppError) throw err
    // Redis unavailable → fail open (graceful degradation, SPEC §2) rather than 500.
    console.warn('[api] rate-limit check skipped (redis error):', (err as Error).message)
  }
}

function applyCors(c: Context, project: PublicProject): boolean {
  const origin = c.req.header('origin')
  if (!origin) return true // non-browser client (server-to-server / curl)
  const allowed = project.allowedOrigins.includes('*') || project.allowedOrigins.includes(origin)
  if (!allowed) return false
  c.header('Access-Control-Allow-Origin', origin)
  c.header('Access-Control-Allow-Credentials', 'true')
  c.header('Vary', 'Origin')
  c.header('Access-Control-Allow-Headers', 'content-type, x-heed-key, x-heed-user')
  c.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  c.header('Access-Control-Max-Age', '600')
  return true
}

/** Resolves the project from `X-Heed-Key`, enforces per-project CORS + Redis rate limiting. */
export const publicProject: MiddlewareHandler<PublicEnv> = async (c, next) => {
  const key = c.req.header('x-heed-key')
  if (!key) throw unauthorized('Missing X-Heed-Key')
  const project = await projects.getByPublicKey(key)
  if (!project) throw unauthorized('Invalid project key')

  if (!applyCors(c, project)) {
    throw new AppError('cors_forbidden', 'Origin not allowed for this project', 403)
  }
  if (c.req.method === 'OPTIONS') return c.body(null, 204)

  await enforceRateLimit(c, project.id)
  c.set('project', project)
  return next()
}
