import { and, db, eq, integrations, newId, posts } from '@heed/db'
import type { AuthContext } from '../context.ts'
import { decryptSecret, encryptSecret } from '../crypto.ts'
import { badRequest, notFound } from '../errors.ts'
import { getProject } from './projects.ts'

const GH = 'https://api.github.com'
const ghHeaders = (token: string) => ({
  authorization: `Bearer ${token}`,
  accept: 'application/vnd.github+json',
  'x-github-api-version': '2022-11-28',
  'content-type': 'application/json',
  'user-agent': 'heed',
})

type GithubConfig = { repo: string }
type IssueLink = { number: number; url: string }

/** List a project's integrations (never returns secrets). */
export async function listIntegrations(ctx: AuthContext, projectId: string) {
  await getProject(ctx, projectId)
  return db
    .select({ id: integrations.id, type: integrations.type, config: integrations.config })
    .from(integrations)
    .where(eq(integrations.projectId, projectId))
}

/** Connect (or update) a GitHub repo for a project; the token is encrypted at rest. */
export async function setGithubIntegration(
  ctx: AuthContext,
  projectId: string,
  input: { repo: string; token?: string },
) {
  await getProject(ctx, projectId)
  if (!/^[\w.-]+\/[\w.-]+$/.test(input.repo)) {
    throw badRequest('Repository must be in "owner/name" form')
  }
  const [existing] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.projectId, projectId), eq(integrations.type, 'github')))
  const secret = input.token ? encryptSecret(input.token) : existing?.secret
  if (!secret) throw badRequest('A GitHub token is required to connect')
  const config: GithubConfig = { repo: input.repo }
  if (existing) {
    await db.update(integrations).set({ config, secret }).where(eq(integrations.id, existing.id))
  } else {
    await db
      .insert(integrations)
      .values({ id: newId('integration'), projectId, type: 'github', config, secret })
  }
  return { repo: input.repo, connected: true }
}

export async function removeGithubIntegration(ctx: AuthContext, projectId: string) {
  await getProject(ctx, projectId)
  await db
    .delete(integrations)
    .where(and(eq(integrations.projectId, projectId), eq(integrations.type, 'github')))
}

/** The GitHub issue linked to a post (admin view), or null. */
export async function getPostIssue(
  ctx: AuthContext,
  projectId: string,
  postId: string,
): Promise<IssueLink | null> {
  await getProject(ctx, projectId)
  const [post] = await db
    .select({ metadata: posts.metadata })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.projectId, projectId)))
  return (post?.metadata as { githubIssue?: IssueLink } | undefined)?.githubIssue ?? null
}

async function resolveGithub(projectId: string): Promise<{ repo: string; token: string } | null> {
  const [row] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.projectId, projectId), eq(integrations.type, 'github')))
  if (!row?.secret) return null
  return { repo: (row.config as GithubConfig).repo, token: decryptSecret(row.secret) }
}

/** Create a GitHub issue from a post and link it on the post (idempotent). */
export async function createGithubIssue(
  ctx: AuthContext,
  projectId: string,
  postId: string,
): Promise<IssueLink> {
  await getProject(ctx, projectId)
  const gh = await resolveGithub(projectId)
  if (!gh) throw badRequest('GitHub is not connected for this project')
  const [post] = await db
    .select({
      title: posts.title,
      body: posts.body,
      voteCount: posts.voteCount,
      metadata: posts.metadata,
    })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.projectId, projectId)))
  if (!post) throw notFound('Post')
  const existing = (post.metadata as { githubIssue?: IssueLink }).githubIssue
  if (existing?.url) return existing

  const res = await fetch(`${GH}/repos/${gh.repo}/issues`, {
    method: 'POST',
    headers: ghHeaders(gh.token),
    body: JSON.stringify({
      title: post.title,
      body: `${post.body || '_No description._'}\n\n— ${post.voteCount} vote(s) on Chorala`,
      labels: ['heed'],
    }),
  })
  if (!res.ok) throw badRequest(`GitHub error ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const issue = (await res.json()) as { number: number; html_url: string }
  const link: IssueLink = { number: issue.number, url: issue.html_url }
  await db
    .update(posts)
    .set({ metadata: { ...(post.metadata as object), githubIssue: link } })
    .where(eq(posts.id, postId))
  return link
}

/** Sync a linked issue on status change: comment + close/reopen. Called by the worker. */
export async function syncGithubIssue(projectId: string, postId: string, statusKind: string) {
  const gh = await resolveGithub(projectId)
  if (!gh) return
  const [post] = await db
    .select({ metadata: posts.metadata })
    .from(posts)
    .where(eq(posts.id, postId))
  const link = (post?.metadata as { githubIssue?: IssueLink } | undefined)?.githubIssue
  if (!link?.number) return

  await fetch(`${GH}/repos/${gh.repo}/issues/${link.number}/comments`, {
    method: 'POST',
    headers: ghHeaders(gh.token),
    body: JSON.stringify({
      body: `Status on Chorala changed to **${statusKind.replace('_', ' ')}**.`,
    }),
  })
  const state = statusKind === 'complete' || statusKind === 'closed' ? 'closed' : 'open'
  await fetch(`${GH}/repos/${gh.repo}/issues/${link.number}`, {
    method: 'PATCH',
    headers: ghHeaders(gh.token),
    body: JSON.stringify({ state }),
  })
}
