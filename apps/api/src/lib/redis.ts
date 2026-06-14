import { env } from '@heed/config'
import { Redis } from 'ioredis'

/** Shared Redis client (lazy connect so importing the app doesn't open a socket). */
export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
  keyPrefix: 'heed:',
})
