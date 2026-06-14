import { and, db, eq, newId, posts, postTags, tags } from '@heed/db'
import type { CreateTagInput } from '@heed/types'
import type { AuthContext } from '../context.ts'
import { conflict, notFound } from '../errors.ts'
import { getProject } from './projects.ts'

export async function listTags(ctx: AuthContext, projectId: string) {
  await getProject(ctx, projectId)
  return db.select().from(tags).where(eq(tags.projectId, projectId))
}

export async function createTag(ctx: AuthContext, projectId: string, input: CreateTagInput) {
  await getProject(ctx, projectId)
  const [dupe] = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.projectId, projectId), eq(tags.name, input.name)))
  if (dupe) throw conflict(`Tag "${input.name}" already exists`)
  const [row] = await db
    .insert(tags)
    .values({ id: newId('tag'), projectId, name: input.name, color: input.color })
    .returning()
  return row
}

export async function deleteTag(ctx: AuthContext, projectId: string, id: string) {
  await getProject(ctx, projectId)
  const [row] = await db.select().from(tags).where(eq(tags.id, id))
  if (!row || row.projectId !== projectId) throw notFound('Tag')
  await db.delete(tags).where(eq(tags.id, id))
  return { id, deleted: true }
}

/** Replace a post's tag set (validates all tags belong to the project). */
export async function setPostTags(
  ctx: AuthContext,
  projectId: string,
  postId: string,
  tagIds: string[],
) {
  await getProject(ctx, projectId)
  const [post] = await db
    .select({ id: posts.id, projectId: posts.projectId })
    .from(posts)
    .where(eq(posts.id, postId))
  if (!post || post.projectId !== projectId) throw notFound('Post')

  if (tagIds.length > 0) {
    const valid = await db.select({ id: tags.id }).from(tags).where(eq(tags.projectId, projectId))
    const validIds = new Set(valid.map((t) => t.id))
    for (const t of tagIds) if (!validIds.has(t)) throw notFound(`Tag ${t}`)
  }

  await db.delete(postTags).where(eq(postTags.postId, postId))
  if (tagIds.length > 0) {
    await db.insert(postTags).values(tagIds.map((tagId) => ({ postId, tagId })))
  }
  return { postId, tagIds }
}
