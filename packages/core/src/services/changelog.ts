import { and, changelogEntries, db, desc, eq, newId } from '@heed/db'
import type { CreateChangelogInput, UpdateChangelogInput } from '@heed/types'
import type { AuthContext } from '../context.ts'
import { notFound } from '../errors.ts'
import { enqueueWebhookEvent } from '../queues.ts'
import { getProject } from './projects.ts'

export async function listChangelog(
  ctx: AuthContext,
  projectId: string,
  opts: { publishedOnly?: boolean } = {},
) {
  await getProject(ctx, projectId)
  const filters = [eq(changelogEntries.projectId, projectId)]
  if (opts.publishedOnly) filters.push(eq(changelogEntries.status, 'published'))
  return db
    .select()
    .from(changelogEntries)
    .where(and(...filters))
    .orderBy(desc(changelogEntries.publishedAt), desc(changelogEntries.createdAt))
}

async function getEntry(ctx: AuthContext, projectId: string, id: string) {
  await getProject(ctx, projectId)
  const [row] = await db.select().from(changelogEntries).where(eq(changelogEntries.id, id))
  if (!row || row.projectId !== projectId) throw notFound('Changelog entry')
  return row
}

export const getChangelog = getEntry

export async function createChangelog(
  ctx: AuthContext,
  projectId: string,
  input: CreateChangelogInput,
) {
  await getProject(ctx, projectId)
  const [row] = await db
    .insert(changelogEntries)
    .values({
      id: newId('changelogEntry'),
      projectId,
      title: input.title,
      body: input.body,
      status: input.status,
      labels: input.labels,
      linkedPostIds: input.linkedPostIds,
      publishedAt: input.status === 'published' ? new Date() : null,
    })
    .returning()
  if (row?.status === 'published') {
    await enqueueWebhookEvent(projectId, 'changelog.published', { changelogId: row.id })
  }
  return row
}

export async function updateChangelog(
  ctx: AuthContext,
  projectId: string,
  id: string,
  input: UpdateChangelogInput,
) {
  const existing = await getEntry(ctx, projectId, id)
  const becomingPublished = input.status === 'published' && existing.status !== 'published'
  const [row] = await db
    .update(changelogEntries)
    .set({
      title: input.title,
      body: input.body,
      status: input.status,
      labels: input.labels,
      linkedPostIds: input.linkedPostIds,
      publishedAt: becomingPublished ? new Date() : undefined,
    })
    .where(eq(changelogEntries.id, id))
    .returning()
  if (becomingPublished) {
    await enqueueWebhookEvent(projectId, 'changelog.published', { changelogId: id })
  }
  return row
}

export async function deleteChangelog(ctx: AuthContext, projectId: string, id: string) {
  await getEntry(ctx, projectId, id)
  await db.delete(changelogEntries).where(eq(changelogEntries.id, id))
  return { id, deleted: true }
}
