import { createHmac } from 'node:crypto'
import { clusterThemes, createProvider, processPost, summarizePost } from '@chorala/ai'
import { env } from '@chorala/config'
import { integrations, QUEUE_PREFIX } from '@chorala/core'
import { and, db, eq, webhooks } from '@chorala/db'
import { sendEmail } from '@chorala/email'
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
        'x-chorala-event': data.event,
        'x-chorala-signature': signature,
      },
      body,
    })
    if (!res.ok) throw new Error(`webhook ${hook.url} → ${res.status}`)
  }
}

const webhookWorker = new Worker('webhooks', (job: Job) => deliverWebhooks(job.data), opts)

// --- Email delivery ---
const emailWorker = new Worker('email', (job: Job) => sendEmail(job.data), opts)

// --- Integrations (GitHub issue sync on status change) ---
const integrationWorker = new Worker(
  'integrations',
  (job: Job) => {
    if (job.name === 'github-sync') {
      return integrations.syncGithubIssue(job.data.projectId, job.data.postId, job.data.statusKind)
    }
    return Promise.resolve()
  },
  opts,
)

for (const [name, worker] of [
  ['ai', aiWorker],
  ['webhooks', webhookWorker],
  ['email', emailWorker],
  ['integrations', integrationWorker],
] as const) {
  worker.on('failed', (job, err) =>
    console.error(`[worker:${name}] job ${job?.id} failed:`, err.message),
  )
}

console.log(
  `✓ chorala-worker running — ai provider: ${provider.name}, email: ${env.CHORALA_EMAIL_TRANSPORT}`,
)

async function shutdown() {
  await Promise.all([
    aiWorker.close(),
    webhookWorker.close(),
    emailWorker.close(),
    integrationWorker.close(),
  ])
  await redis.quit()
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
