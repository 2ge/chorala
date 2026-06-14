import {
  aiJobs,
  and,
  asc,
  boards,
  db,
  desc,
  eq,
  ilike,
  inArray,
  newId,
  or,
  posts,
  sql,
  statuses,
  votes,
} from '@chorala/db'
import type { AdminCreatePostInput, PostSort, UpdatePostInput } from '@chorala/types'
import type { AuthContext } from '../context.ts'
import { badRequest, conflict, notFound } from '../errors.ts'
import { enqueueIntegrationSync, enqueuePostProcessing, enqueueWebhookEvent } from '../queues.ts'
import { getProject } from './projects.ts'

/** Post columns excluding the (large, internal) embedding vector — never serialized to clients. */
export const postColumns = {
  id: posts.id,
  boardId: posts.boardId,
  projectId: posts.projectId,
  authorEndUserId: posts.authorEndUserId,
  authorMemberId: posts.authorMemberId,
  title: posts.title,
  body: posts.body,
  originalLocale: posts.originalLocale,
  statusId: posts.statusId,
  isPinned: posts.isPinned,
  voteCount: posts.voteCount,
  commentCount: posts.commentCount,
  mergedIntoPostId: posts.mergedIntoPostId,
  eta: posts.eta,
  createdAt: posts.createdAt,
  updatedAt: posts.updatedAt,
}

type ListOpts = {
  boardId?: string
  statusId?: string
  search?: string
  sort?: PostSort
  includeMerged?: boolean
}

function orderFor(sort: PostSort | undefined) {
  switch (sort) {
    case 'new':
      return [desc(posts.createdAt)]
    case 'oldest':
      return [asc(posts.createdAt)]
    case 'trending':
      return [desc(posts.voteCount), desc(posts.createdAt)]
    default:
      return [desc(posts.isPinned), desc(posts.voteCount)]
  }
}

export async function listPosts(ctx: AuthContext, projectId: string, opts: ListOpts = {}) {
  await getProject(ctx, projectId)
  const filters = [eq(posts.projectId, projectId)]
  if (opts.boardId) filters.push(eq(posts.boardId, opts.boardId))
  if (opts.statusId) filters.push(eq(posts.statusId, opts.statusId))
  if (!opts.includeMerged) filters.push(sql`${posts.mergedIntoPostId} is null`)
  if (opts.search) {
    const term = `%${opts.search}%`
    const match = or(ilike(posts.title, term), ilike(posts.body, term))
    if (match) filters.push(match)
  }
  return db
    .select(postColumns)
    .from(posts)
    .where(and(...filters))
    .orderBy(...orderFor(opts.sort))
}

/** Semantic search by a query embedding (pgvector cosine). Returns posts + similarity. */
export async function semanticSearch(
  ctx: AuthContext,
  projectId: string,
  embedding: number[],
  limit = 10,
) {
  await getProject(ctx, projectId)
  const literal = `[${embedding.join(',')}]`
  const rows = await db.execute<{
    id: string
    title: string
    body: string
    vote_count: number
    similarity: number
  }>(sql`
    select id, title, body, vote_count, 1 - (embedding <=> ${literal}::vector) as similarity
    from posts
    where project_id = ${projectId} and merged_into_post_id is null and embedding is not null
    order by embedding <=> ${literal}::vector
    limit ${limit}`)
  return Array.from(rows).map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    voteCount: r.vote_count,
    similarity: Number(r.similarity),
  }))
}

export async function getPost(ctx: AuthContext, projectId: string, id: string) {
  await getProject(ctx, projectId)
  const [row] = await db
    .select(postColumns)
    .from(posts)
    .where(and(eq(posts.id, id), eq(posts.projectId, projectId)))
  if (!row) throw notFound('Post')
  return row
}

async function assertBoardInProject(projectId: string, boardId: string) {
  const [b] = await db
    .select({ id: boards.id })
    .from(boards)
    .where(and(eq(boards.id, boardId), eq(boards.projectId, projectId)))
  if (!b) throw badRequest('Board does not belong to this project')
}

export async function createPost(ctx: AuthContext, projectId: string, input: AdminCreatePostInput) {
  await getProject(ctx, projectId)
  await assertBoardInProject(projectId, input.boardId)
  const id = newId('post')
  await db.insert(posts).values({
    id,
    projectId,
    boardId: input.boardId,
    title: input.title,
    body: input.body,
    statusId: input.statusId,
    originalLocale: input.locale ?? 'en',
    authorMemberId: ctx.memberId,
  })
  await enqueuePostProcessing(id)
  await enqueueWebhookEvent(projectId, 'post.created', { postId: id, boardId: input.boardId })
  return getPost(ctx, projectId, id)
}

export async function updatePost(
  ctx: AuthContext,
  projectId: string,
  id: string,
  input: UpdatePostInput,
) {
  await getPost(ctx, projectId, id)
  if (input.boardId) await assertBoardInProject(projectId, input.boardId)
  await db
    .update(posts)
    .set({
      title: input.title,
      body: input.body,
      statusId: input.statusId ?? undefined,
      boardId: input.boardId,
      isPinned: input.isPinned,
      eta: input.eta ? new Date(input.eta) : input.eta === null ? null : undefined,
    })
    .where(eq(posts.id, id))
  return getPost(ctx, projectId, id)
}

export async function changeStatus(
  ctx: AuthContext,
  projectId: string,
  id: string,
  statusId: string | null,
) {
  await getPost(ctx, projectId, id)
  let statusKind: string | null = null
  if (statusId) {
    const [s] = await db
      .select({ id: statuses.id, kind: statuses.kind })
      .from(statuses)
      .where(and(eq(statuses.id, statusId), eq(statuses.projectId, projectId)))
    if (!s) throw badRequest('Status does not belong to this project')
    statusKind = s.kind
  }
  await db.update(posts).set({ statusId }).where(eq(posts.id, id))
  await enqueueWebhookEvent(projectId, 'post.status_changed', { postId: id, statusId })
  if (statusKind) await enqueueIntegrationSync(projectId, id, statusKind)
  return getPost(ctx, projectId, id)
}

export async function setPinned(ctx: AuthContext, projectId: string, id: string, pinned: boolean) {
  await getPost(ctx, projectId, id)
  await db.update(posts).set({ isPinned: pinned }).where(eq(posts.id, id))
  return getPost(ctx, projectId, id)
}

/** Recompute the denormalized vote_count for a post from the votes table. */
async function recountVotes(postId: string) {
  await db
    .update(posts)
    .set({
      voteCount: sql`(select count(*)::int from ${votes} where ${votes.postId} = ${postId})`,
    })
    .where(eq(posts.id, postId))
}

/**
 * Merge `sourceId` into `targetId`: move votes to the canonical post (de-duping voters),
 * mark the source as merged. Admin-confirmed only — never automatic (SPEC §11).
 */
export async function mergePost(
  ctx: AuthContext,
  projectId: string,
  sourceId: string,
  targetId: string,
) {
  if (sourceId === targetId) throw badRequest('Cannot merge a post into itself')
  const source = await getPost(ctx, projectId, sourceId)
  const target = await getPost(ctx, projectId, targetId)
  if (target.mergedIntoPostId) throw conflict('Target post is itself merged into another post')
  if (source.mergedIntoPostId) throw conflict('Source post is already merged')

  // Move source votes onto target, skipping voters who already voted for target.
  const sourceVotes = await db
    .select({ endUserId: votes.endUserId, weight: votes.weight })
    .from(votes)
    .where(eq(votes.postId, sourceId))
  if (sourceVotes.length > 0) {
    await db
      .insert(votes)
      .values(
        sourceVotes.map((v) => ({ postId: targetId, endUserId: v.endUserId, weight: v.weight })),
      )
      .onConflictDoNothing()
  }

  await db.update(posts).set({ mergedIntoPostId: targetId }).where(eq(posts.id, sourceId))
  await recountVotes(targetId)
  await enqueueWebhookEvent(projectId, 'post.merged', { sourceId, targetId })
  return getPost(ctx, projectId, targetId)
}

export async function deletePost(ctx: AuthContext, projectId: string, id: string) {
  await getPost(ctx, projectId, id)
  await db.delete(posts).where(eq(posts.id, id))
  return { id, deleted: true }
}

export type DedupSuggestion = { postId: string; title: string; similarity: number }

/** Possible-duplicate suggestions for a post (from the AI dedup task; admin confirms). */
export async function getDedupSuggestions(
  ctx: AuthContext,
  projectId: string,
  postId: string,
): Promise<DedupSuggestion[]> {
  await getProject(ctx, projectId)
  const [job] = await db
    .select({ result: aiJobs.result })
    .from(aiJobs)
    .where(
      and(eq(aiJobs.projectId, projectId), eq(aiJobs.kind, 'dedup'), eq(aiJobs.inputRef, postId)),
    )
    .orderBy(desc(aiJobs.createdAt))
    .limit(1)
  const raw = (job?.result as { suggestions?: DedupSuggestion[] } | null)?.suggestions ?? []
  if (raw.length === 0) return []

  // Keep only suggestions whose target still exists and isn't itself merged away.
  const ids = raw.map((s) => s.postId)
  const live = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(inArray(posts.id, ids), sql`${posts.mergedIntoPostId} is null`))
  const liveIds = new Set(live.map((p) => p.id))
  return raw.filter((s) => s.postId !== postId && liveIds.has(s.postId))
}
