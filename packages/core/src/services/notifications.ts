import { env } from '@chorala/config'
import {
  and,
  changelogEntries,
  changelogSubscribers,
  comments,
  db,
  desc,
  endUsers,
  eq,
  isNotNull,
  isNull,
  members,
  newId,
  notifications,
  posts,
  projects,
  segments,
  statuses,
  votes,
} from '@chorala/db'
import { changelogPublishedEmail, notificationEmail } from '@chorala/email'
import { segmentDefinition } from '@chorala/types'
import type { AuthContext } from '../context.ts'
import { enqueueEmail } from '../queues.ts'
import { type Recipient, renderVars, resolveSegment } from './segments.ts'

type ProjectRef = { id: string; name: string; customDomain: string | null }

function portalUrl(p: ProjectRef): string {
  return p.customDomain ? `https://${p.customDomain}` : `${env.CHORALA_PUBLIC_URL}/portal/${p.id}`
}

async function loadPostAndProject(projectId: string, postId: string) {
  const [post] = await db.select().from(posts).where(eq(posts.id, postId))
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
  if (!post || !project || post.projectId !== projectId) return null
  return { post, project: project as ProjectRef }
}

/** End-users who voted on a post AND have a real email (anonymous voters are skipped). */
async function votersWithEmail(postId: string) {
  return db
    .select({ id: endUsers.id, email: endUsers.email })
    .from(votes)
    .innerJoin(endUsers, eq(endUsers.id, votes.endUserId))
    .where(and(eq(votes.postId, postId), isNotNull(endUsers.email)))
}

async function inAppForEndUser(endUserId: string, type: string, payload: Record<string, unknown>) {
  await db.insert(notifications).values({
    id: newId('notification'),
    recipientType: 'end_user',
    recipientId: endUserId,
    type,
    payload,
  })
}

/** In-app notification for every member of the project's org (the admin notification centre). */
async function inAppForOrgMembers(
  projectId: string,
  type: string,
  payload: Record<string, unknown>,
) {
  const [project] = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(eq(projects.id, projectId))
  if (!project) return
  const rows = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.orgId, project.orgId))
  if (!rows.length) return
  await db.insert(notifications).values(
    rows.map((m) => ({
      id: newId('notification'),
      recipientType: 'member' as const,
      recipientId: m.id,
      type,
      payload,
    })),
  )
}

// ---- fan-out handlers (invoked by the worker on enqueued jobs) ----

/** A post moved status → email the voters + author who follow it. */
export async function fanOutStatusChange(projectId: string, postId: string) {
  const ctx = await loadPostAndProject(projectId, postId)
  if (!ctx) return
  const { post, project } = ctx
  let statusName = 'updated'
  if (post.statusId) {
    const [s] = await db
      .select({ name: statuses.name })
      .from(statuses)
      .where(eq(statuses.id, post.statusId))
    if (s) statusName = s.name
  }
  const url = portalUrl(project)
  const recipients = new Map<string, string | null>()
  for (const v of await votersWithEmail(postId)) recipients.set(v.id, v.email)
  if (post.authorEndUserId && !recipients.has(post.authorEndUserId)) {
    const [a] = await db
      .select({ id: endUsers.id, email: endUsers.email })
      .from(endUsers)
      .where(eq(endUsers.id, post.authorEndUserId))
    if (a) recipients.set(a.id, a.email)
  }
  for (const [euId, email] of recipients) {
    await inAppForEndUser(euId, 'post.status_changed', { postId, title: post.title, statusName })
    if (email) {
      await enqueueEmail({
        to: email,
        ...notificationEmail({
          title: `“${post.title}” → ${statusName}`,
          message: `An idea you follow on ${project.name} is now “${statusName}”.`,
          url,
        }),
      })
    }
  }
}

/** A comment was added. Admin reply → email the post author; public comment → notify admins. */
export async function fanOutCommentCreated(projectId: string, postId: string, commentId: string) {
  const [c] = await db.select().from(comments).where(eq(comments.id, commentId))
  if (!c || c.isInternal) return
  const ctx = await loadPostAndProject(projectId, postId)
  if (!ctx) return
  const { post, project } = ctx

  if (c.authorMemberId) {
    // Admin reply → notify the post author.
    if (!post.authorEndUserId) return
    const [a] = await db
      .select({ id: endUsers.id, email: endUsers.email })
      .from(endUsers)
      .where(eq(endUsers.id, post.authorEndUserId))
    if (!a) return
    await inAppForEndUser(a.id, 'comment.reply', { postId, title: post.title })
    if (a.email) {
      await enqueueEmail({
        to: a.email,
        ...notificationEmail({
          title: `New reply on “${post.title}”`,
          message: c.body.slice(0, 200),
          url: portalUrl(project),
        }),
      })
    }
  } else {
    // Public comment → in-app to the admins.
    await inAppForOrgMembers(projectId, 'post.commented', { postId, title: post.title })
  }
}

/** A new public post → in-app to the admins. */
export async function fanOutPostCreated(projectId: string, postId: string) {
  const [post] = await db.select({ title: posts.title }).from(posts).where(eq(posts.id, postId))
  if (!post) return
  await inAppForOrgMembers(projectId, 'post.created', { postId, title: post.title })
}

/** A changelog entry was published → email all subscribers. */
export async function fanOutChangelogPublished(projectId: string, changelogId: string) {
  const [entry] = await db
    .select()
    .from(changelogEntries)
    .where(eq(changelogEntries.id, changelogId))
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
  if (!entry || !project || entry.status !== 'published') return
  const url = portalUrl(project as ProjectRef)
  const projectName = (project as ProjectRef).name

  // Targeted: resolve the segment to matching end-users (with their attributes for variables).
  // Untargeted: every changelog subscriber. Either way we personalise `{{vars}}` per recipient.
  let recipients: Recipient[]
  if (entry.segmentId) {
    const [seg] = await db.select().from(segments).where(eq(segments.id, entry.segmentId))
    recipients = seg
      ? await resolveSegment(projectId, segmentDefinition.parse(seg.definition), {
          withEmailOnly: true,
        })
      : []
  } else {
    const subs = await db
      .select({ email: changelogSubscribers.email })
      .from(changelogSubscribers)
      .where(eq(changelogSubscribers.projectId, projectId))
    recipients = subs.map((s) => ({
      id: '',
      email: s.email,
      name: null,
      locale: 'en',
      companyName: null,
      plan: null,
    }))
  }

  let sent = 0
  for (const r of recipients) {
    if (!r.email) continue
    await enqueueEmail({
      to: r.email,
      ...changelogPublishedEmail({
        projectName,
        title: renderVars(entry.title, r),
        body: renderVars(entry.body, r),
        url: `${url}/changelog`,
      }),
    })
    sent++
  }
  await db
    .update(changelogEntries)
    .set({ recipientCount: sent })
    .where(eq(changelogEntries.id, changelogId))
}

// ---- admin in-app notification centre ----

export async function listForMember(ctx: AuthContext, limit = 30) {
  if (ctx.kind !== 'session' || !ctx.memberId) return { items: [], unread: 0 }
  const items = await db
    .select()
    .from(notifications)
    .where(
      and(eq(notifications.recipientType, 'member'), eq(notifications.recipientId, ctx.memberId)),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
  const unread = items.filter((n) => !n.readAt).length
  return { items, unread }
}

export async function markAllRead(ctx: AuthContext) {
  if (ctx.kind !== 'session' || !ctx.memberId) return { ok: true }
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.recipientType, 'member'),
        eq(notifications.recipientId, ctx.memberId),
        isNull(notifications.readAt),
      ),
    )
  return { ok: true }
}
