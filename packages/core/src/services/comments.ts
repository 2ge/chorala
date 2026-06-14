import { and, asc, comments, db, eq, newId, posts, sql } from '@heed/db'
import { notFound } from '../errors.ts'
import { enqueueWebhookEvent } from '../queues.ts'

type CommentAuthor = { endUserId?: string; memberId?: string }

async function assertPostInProject(projectId: string, postId: string) {
  const [post] = await db
    .select({ id: posts.id, projectId: posts.projectId })
    .from(posts)
    .where(eq(posts.id, postId))
  if (!post || post.projectId !== projectId) throw notFound('Post')
  return post
}

async function recountComments(postId: string) {
  await db
    .update(posts)
    .set({
      commentCount: sql`(select count(*)::int from ${comments} where ${comments.postId} = ${postId} and ${comments.isInternal} = false)`,
    })
    .where(eq(posts.id, postId))
}

export async function listComments(
  projectId: string,
  postId: string,
  opts: { includeInternal?: boolean } = {},
) {
  await assertPostInProject(projectId, postId)
  const filters = [eq(comments.postId, postId)]
  if (!opts.includeInternal) filters.push(eq(comments.isInternal, false))
  return db
    .select()
    .from(comments)
    .where(and(...filters))
    .orderBy(asc(comments.createdAt))
}

export async function createComment(
  projectId: string,
  postId: string,
  input: { body: string; parentCommentId?: string; isInternal?: boolean },
  author: CommentAuthor,
) {
  await assertPostInProject(projectId, postId)
  const id = newId('comment')
  const [row] = await db
    .insert(comments)
    .values({
      id,
      postId,
      body: input.body,
      parentCommentId: input.parentCommentId,
      isInternal: input.isInternal ?? false,
      authorEndUserId: author.endUserId,
      authorMemberId: author.memberId,
    })
    .returning()
  await recountComments(postId)
  // Public comments fire a webhook; internal staff notes do not.
  if (!input.isInternal) {
    await enqueueWebhookEvent(projectId, 'comment.created', { postId, commentId: id })
  }
  return row
}

export async function deleteComment(projectId: string, postId: string, id: string) {
  await assertPostInProject(projectId, postId)
  const [row] = await db.select().from(comments).where(eq(comments.id, id))
  if (!row || row.postId !== postId) throw notFound('Comment')
  await db.delete(comments).where(eq(comments.id, id))
  await recountComments(postId)
  return { id, deleted: true }
}
