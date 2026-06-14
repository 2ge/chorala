import {
  and,
  asc,
  boards,
  changelogEntries,
  changelogSubscribers,
  db,
  desc,
  eq,
  ilike,
  inArray,
  newId,
  or,
  posts,
  postTags,
  postTranslations,
  sql,
  statuses,
  votes,
} from '@heed/db'
import type { CreateCommentInput, CreatePostInput, PostSort } from '@heed/types'
import { badRequest, notFound } from '../errors.ts'
import { createComment, listComments } from './comments.ts'
import { postColumns } from './posts.ts'

type PostRow = Awaited<ReturnType<typeof getPostRows>>[number]

function orderFor(sort: PostSort) {
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

async function getPostRows(
  where: ReturnType<typeof and>,
  order: ReturnType<typeof desc>[],
  limit?: number,
) {
  const q = db
    .select(postColumns)
    .from(posts)
    .where(where)
    .orderBy(...order)
  return limit ? q.limit(limit) : q
}

/** Overlay localized title/body for `locale`, and mark `hasVoted` for `endUserId`. */
async function decorate(
  rows: PostRow[],
  locale: string | undefined,
  endUserId: string | undefined,
) {
  if (rows.length === 0) return []
  const ids = rows.map((r) => r.id)

  const translations =
    locale && locale !== 'en'
      ? await db
          .select()
          .from(postTranslations)
          .where(and(inArray(postTranslations.postId, ids), eq(postTranslations.locale, locale)))
      : []
  const trMap = new Map(translations.map((t) => [t.postId, t]))

  const myVotes = endUserId
    ? await db
        .select({ postId: votes.postId })
        .from(votes)
        .where(and(inArray(votes.postId, ids), eq(votes.endUserId, endUserId)))
    : []
  const voted = new Set(myVotes.map((v) => v.postId))

  return rows.map((r) => {
    const tr = trMap.get(r.id)
    return {
      ...r,
      title: tr?.title ?? r.title,
      body: tr?.body ?? r.body,
      displayLocale: tr ? locale : r.originalLocale,
      hasVoted: endUserId ? voted.has(r.id) : undefined,
    }
  })
}

export type PublicListOpts = {
  boardSlug?: string
  statusId?: string
  tagId?: string
  sort?: PostSort
  locale?: string
  search?: string
  limit?: number
  endUserId?: string
}

export async function listPublicBoards(projectId: string, opts: PublicListOpts = {}) {
  const visibleBoards = await db
    .select()
    .from(boards)
    .where(and(eq(boards.projectId, projectId), eq(boards.isPrivate, false)))
    .orderBy(asc(boards.position))

  const filters = [eq(posts.projectId, projectId), sql`${posts.mergedIntoPostId} is null`]
  if (opts.boardSlug) {
    const board = visibleBoards.find((b) => b.slug === opts.boardSlug)
    if (!board) throw notFound('Board')
    filters.push(eq(posts.boardId, board.id))
  } else {
    filters.push(
      inArray(
        posts.boardId,
        visibleBoards.map((b) => b.id),
      ),
    )
  }
  if (opts.statusId) filters.push(eq(posts.statusId, opts.statusId))
  if (opts.tagId) {
    filters.push(
      inArray(
        posts.id,
        db.select({ id: postTags.postId }).from(postTags).where(eq(postTags.tagId, opts.tagId)),
      ),
    )
  }
  if (opts.search) {
    const term = `%${opts.search}%`
    const m = or(ilike(posts.title, term), ilike(posts.body, term))
    if (m) filters.push(m)
  }

  // Guard: no visible boards → no posts.
  if (visibleBoards.length === 0) return { boards: [], posts: [] }

  const rows = await getPostRows(and(...filters), orderFor(opts.sort ?? 'top'), opts.limit ?? 50)
  const decorated = await decorate(rows, opts.locale, opts.endUserId)
  return { boards: visibleBoards, posts: decorated }
}

export async function getPublicPost(
  projectId: string,
  postId: string,
  opts: { locale?: string; endUserId?: string } = {},
) {
  const [row] = await getPostRows(and(eq(posts.id, postId), eq(posts.projectId, projectId)), [
    desc(posts.createdAt),
  ])
  if (!row) throw notFound('Post')
  const [post] = await decorate([row], opts.locale, opts.endUserId)
  const publicComments = await listComments(projectId, postId, { includeInternal: false })
  const translations = await db
    .select()
    .from(postTranslations)
    .where(eq(postTranslations.postId, postId))
  return { post, comments: publicComments, translations }
}

export async function createPublicPost(
  projectId: string,
  endUserId: string,
  input: CreatePostInput,
) {
  const [board] = await db
    .select()
    .from(boards)
    .where(
      and(
        eq(boards.projectId, projectId),
        eq(boards.slug, input.boardSlug),
        eq(boards.isPrivate, false),
      ),
    )
  if (!board) throw notFound('Board')

  const [openStatus] = await db
    .select({ id: statuses.id })
    .from(statuses)
    .where(and(eq(statuses.projectId, projectId), eq(statuses.kind, 'open')))
    .orderBy(asc(statuses.position))

  const id = newId('post')
  await db.insert(posts).values({
    id,
    projectId,
    boardId: board.id,
    authorEndUserId: endUserId,
    title: input.title,
    body: input.body,
    originalLocale: input.locale ?? 'en',
    statusId: openStatus?.id,
  })
  // NOTE: embed + dedup + translate jobs are enqueued here in Phase 6 (worker).
  return getPublicPost(projectId, id, { locale: input.locale, endUserId })
}

export async function addPublicComment(
  projectId: string,
  postId: string,
  endUserId: string,
  input: CreateCommentInput,
) {
  // Public commenters can never post internal staff notes.
  return createComment(
    projectId,
    postId,
    { body: input.body, parentCommentId: input.parentCommentId, isInternal: false },
    { endUserId },
  )
}

export async function getRoadmap(
  projectId: string,
  opts: { locale?: string; endUserId?: string } = {},
) {
  const roadmapStatuses = await db
    .select()
    .from(statuses)
    .where(and(eq(statuses.projectId, projectId), eq(statuses.showOnRoadmap, true)))
    .orderBy(asc(statuses.position))

  const columns = []
  for (const status of roadmapStatuses) {
    const rows = await getPostRows(
      and(
        eq(posts.projectId, projectId),
        eq(posts.statusId, status.id),
        sql`${posts.mergedIntoPostId} is null`,
      ),
      [desc(posts.voteCount)],
      50,
    )
    columns.push({ status, posts: await decorate(rows, opts.locale, opts.endUserId) })
  }
  return { columns }
}

export async function getPublicChangelog(projectId: string) {
  return db
    .select()
    .from(changelogEntries)
    .where(and(eq(changelogEntries.projectId, projectId), eq(changelogEntries.status, 'published')))
    .orderBy(desc(changelogEntries.publishedAt))
}

export async function subscribeChangelog(projectId: string, email: string, endUserId?: string) {
  const [existing] = await db
    .select()
    .from(changelogSubscribers)
    .where(
      and(eq(changelogSubscribers.projectId, projectId), eq(changelogSubscribers.email, email)),
    )
  if (existing) return existing
  const [row] = await db
    .insert(changelogSubscribers)
    .values({ id: newId('changelogSubscriber'), projectId, email, endUserId })
    .returning()
  if (!row) throw badRequest('Failed to subscribe')
  return row
}
