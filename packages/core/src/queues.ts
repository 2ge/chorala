import { env, isAiEnabled } from '@chorala/config'
import type { WebhookEvent } from '@chorala/types'
import { type ConnectionOptions, Queue } from 'bullmq'
import { Redis } from 'ioredis'

/** Shared queue names + key prefix (matches the host's `chorala` redis convention). */
export const QUEUE_PREFIX = 'chorala'
export const QUEUES = {
  ai: 'ai',
  webhooks: 'webhooks',
  email: 'email',
  integrations: 'integrations',
  notifications: 'notifications',
} as const

let connection: Redis | null = null
let queues: Record<string, Queue> | null = null

function getQueue(name: string): Queue {
  if (!connection) connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
  if (!queues) queues = {}
  if (!queues[name]) {
    queues[name] = new Queue(name, {
      connection: connection as unknown as ConnectionOptions,
      prefix: QUEUE_PREFIX,
    })
  }
  return queues[name]
}

const JOB_OPTS = {
  attempts: 4,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: 200,
  removeOnFail: 500,
}

/** Enqueue without ever throwing into the request path — if Redis is down we log + continue. */
async function safeAdd(queue: string, job: string, data: unknown) {
  // Don't open queue connections during unit tests (keeps Vitest from hanging on handles).
  if (env.NODE_ENV === 'test') return
  try {
    await getQueue(queue).add(job, data, JOB_OPTS)
  } catch (err) {
    console.warn(`[queues] enqueue ${queue}/${job} failed (continuing):`, (err as Error).message)
  }
}

/** Embed + dedup + translate a post (no-op when AI is disabled). */
export async function enqueuePostProcessing(postId: string) {
  if (!isAiEnabled()) return
  await safeAdd(QUEUES.ai, 'processPost', { postId })
}

export async function enqueueClusterThemes(projectId: string) {
  if (!isAiEnabled()) return
  await safeAdd(QUEUES.ai, 'clusterThemes', { projectId })
}

/**
 * Register the repeatable weekly-digest job (Mondays 08:00). Called once at worker startup. The
 * digest is deterministic so this isn't gated on AI — but it only sends mail when the email
 * transport is configured.
 */
export async function scheduleWeeklyDigests() {
  if (env.NODE_ENV === 'test') return
  try {
    await getQueue(QUEUES.ai).add(
      'weekly-digest',
      {},
      { repeat: { pattern: '0 8 * * 1' }, removeOnComplete: 10, removeOnFail: 10 },
    )
  } catch (err) {
    console.warn('[queues] schedule weekly-digest failed (continuing):', (err as Error).message)
  }
}

export async function enqueueWebhookEvent(
  projectId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>,
) {
  await safeAdd(QUEUES.webhooks, 'deliver', { projectId, event, payload })
}

export async function enqueueEmail(data: {
  to: string
  subject: string
  html: string
  text: string
}) {
  await safeAdd(QUEUES.email, 'send', data)
}

/** Sync a post's linked GitHub issue after a status change. */
export async function enqueueIntegrationSync(
  projectId: string,
  postId: string,
  statusKind: string,
) {
  await safeAdd(QUEUES.integrations, 'github-sync', { projectId, postId, statusKind })
}

/** Fan-out a notification (status change, comment, changelog, new post) — handled by the worker. */
export async function enqueueNotification(job: string, data: Record<string, unknown>) {
  await safeAdd(QUEUES.notifications, job, data)
}

/** Auto-create a GitHub issue for a new post (worker decides if the integration opted in). */
export async function enqueueGithubAutoCreate(projectId: string, postId: string) {
  await safeAdd(QUEUES.integrations, 'github-autocreate', { projectId, postId })
}
