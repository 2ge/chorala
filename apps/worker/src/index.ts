import { createHmac } from 'node:crypto'
import {
  buildWeeklyDigest,
  clusterThemes,
  createProvider,
  processPost,
  summarizePost,
} from '@chorala/ai'
import { env, isEmailEnabled } from '@chorala/config'
import { integrations, notifications, QUEUE_PREFIX, scheduleWeeklyDigests } from '@chorala/core'
import { and, db, eq, inArray, members, projects, users, webhooks } from '@chorala/db'
import { sendEmail, weeklyDigestEmail } from '@chorala/email'
import { type ConnectionOptions, type Job, Worker } from 'bullmq'
import { Redis } from 'ioredis'

const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
const connection = redis as unknown as ConnectionOptions
const provider = createProvider()
const opts = { connection, prefix: QUEUE_PREFIX, concurrency: 5 }

/** Build + email the weekly digest to every project's org admins (deterministic; AI optional). */
async function runWeeklyDigests() {
  const allProjects = await db
    .select({ id: projects.id, name: projects.name, orgId: projects.orgId })
    .from(projects)
  for (const project of allProjects) {
    const digest = await buildWeeklyDigest(provider, project.id)
    if (digest.newPosts === 0 && digest.shipped.length === 0) continue
    if (!isEmailEnabled()) {
      console.log(`[digest] ${project.name}: ${digest.narrative} (email disabled — not sent)`)
      continue
    }
    const admins = await db
      .select({ email: users.email })
      .from(members)
      .innerJoin(users, eq(users.id, members.userId))
      .where(and(eq(members.orgId, project.orgId), inArray(members.role, ['owner', 'admin'])))
    const mail = weeklyDigestEmail({
      projectName: project.name,
      narrative: digest.narrative,
      newPosts: digest.newPosts,
      newVotes: digest.newVotes,
      topVoted: digest.topVoted,
      shipped: digest.shipped,
      url: `${env.CHORALA_PUBLIC_URL}/admin/${project.id}/analytics`,
    })
    for (const a of admins) {
      if (a.email) await sendEmail({ to: a.email, ...mail })
    }
  }
}

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
      case 'weekly-digest':
        return runWeeklyDigests()
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
    if (job.name === 'github-autocreate') {
      return integrations.autoCreateIssue(job.data.projectId, job.data.postId)
    }
    return Promise.resolve()
  },
  opts,
)

// --- Notifications (fan-out to voters/subscribers/admins; emails go via the email queue) ---
const notificationWorker = new Worker(
  'notifications',
  (job: Job) => {
    const { projectId, postId, commentId, changelogId } = job.data
    switch (job.name) {
      case 'status-changed':
        return notifications.fanOutStatusChange(projectId, postId)
      case 'comment-created':
        return notifications.fanOutCommentCreated(projectId, postId, commentId)
      case 'post-created':
        return notifications.fanOutPostCreated(projectId, postId)
      case 'changelog-published':
        return notifications.fanOutChangelogPublished(projectId, changelogId)
      default:
        return Promise.resolve()
    }
  },
  opts,
)

for (const [name, worker] of [
  ['ai', aiWorker],
  ['webhooks', webhookWorker],
  ['email', emailWorker],
  ['integrations', integrationWorker],
  ['notifications', notificationWorker],
] as const) {
  worker.on('failed', (job, err) =>
    console.error(`[worker:${name}] job ${job?.id} failed:`, err.message),
  )
}

// Register the repeatable weekly-digest job (idempotent on the repeat key).
scheduleWeeklyDigests().catch((err) =>
  console.warn('[worker] could not schedule weekly digest:', err.message),
)

console.log(
  `✓ chorala-worker running — ai provider: ${provider.name}, email: ${env.CHORALA_EMAIL_TRANSPORT}`,
)

async function shutdown() {
  await Promise.all([
    aiWorker.close(),
    webhookWorker.close(),
    emailWorker.close(),
    integrationWorker.close(),
    notificationWorker.close(),
  ])
  await redis.quit()
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
