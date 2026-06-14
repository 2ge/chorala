import { createHmac } from 'node:crypto'
import { clusterThemes, createProvider, processPost, summarizePost } from '@heed/ai'
import { env } from '@heed/config'
import { QUEUE_PREFIX } from '@heed/core'
import { and, db, eq, webhooks } from '@heed/db'
import { sendEmail } from '@heed/email'
import { type ConnectionOptions, type Job, Worker } from 'bullmq'
import { Redis } from 'ioredis'

const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
const connection = redis as unknown as ConnectionOptions
const provider = createProvider()
const opts = { connection, prefix: QUEUE_PREFIX, concurrency: 5 }

// --- AI jobs ---
const aiWorker = new Worker(
  'ai',
  async (job: Job) => {
    switch (job.name) {
      case 'processPost':
        return processPost(provider, job.data.postId)
      case 'clusterThemes':
        return clusterThemes(provider, job.data.projectId)
      case 'summarize':
        return summarizePost(provider, job.data.postId)
      default:
        return null
    }
  },
  opts,
)

// --- Webhook delivery (HMAC-signed, retried by BullMQ on throw) ---
async function deliverWebhooks(data: {
  projectId: string
  event: string
  payload: Record<string, unknown>
}) {
  const hooks = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.projectId, data.projectId), eq(webhooks.isActive, true)))
  for (const hook of hooks) {
    if (!hook.events.includes(data.event)) continue
    const body = JSON.stringify({ event: data.event, payload: data.payload, timestamp: Date.now() })
    const signature = createHmac('sha256', hook.secret).update(body).digest('hex')
    const res = await fetch(hook.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-heed-event': data.event,
        'x-heed-signature': signature,
      },
      body,
    })
    if (!res.ok) throw new Error(`webhook ${hook.url} → ${res.status}`)
  }
}

const webhookWorker = new Worker('webhooks', (job: Job) => deliverWebhooks(job.data), opts)

// --- Email delivery ---
const emailWorker = new Worker('email', (job: Job) => sendEmail(job.data), opts)

for (const [name, worker] of [
  ['ai', aiWorker],
  ['webhooks', webhookWorker],
  ['email', emailWorker],
] as const) {
  worker.on('failed', (job, err) =>
    console.error(`[worker:${name}] job ${job?.id} failed:`, err.message),
  )
}

console.log(
  `✓ heed-worker running — ai provider: ${provider.name}, email: ${env.HEED_EMAIL_TRANSPORT}`,
)

async function shutdown() {
  await Promise.all([aiWorker.close(), webhookWorker.close(), emailWorker.close()])
  await redis.quit()
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
