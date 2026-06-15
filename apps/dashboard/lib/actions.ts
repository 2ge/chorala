'use server'

import {
  apiKeys,
  boards,
  changelog,
  comments,
  integrations,
  members,
  posts,
  projects,
  publicFeed,
  scoreFields,
  statuses,
  tags,
  votes,
} from '@chorala/core'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuthContext } from './session'

// --- Portal (public, no admin auth) ---
export async function subscribeToChangelog(projectId: string, email: string) {
  await publicFeed.subscribeChangelog(projectId, email)
}

const adminPath = (projectId: string) => `/admin/${projectId}`

// --- Posts / triage ---
export async function changePostStatus(projectId: string, postId: string, statusId: string | null) {
  const ctx = await requireAuthContext()
  await posts.changeStatus(ctx, projectId, postId, statusId)
  revalidatePath(adminPath(projectId), 'layout')
}

export async function togglePin(projectId: string, postId: string, pinned: boolean) {
  const ctx = await requireAuthContext()
  await posts.setPinned(ctx, projectId, postId, pinned)
  revalidatePath(adminPath(projectId), 'layout')
}

export async function mergePost(projectId: string, sourceId: string, targetId: string) {
  const ctx = await requireAuthContext()
  await posts.mergePost(ctx, projectId, sourceId, targetId)
  revalidatePath(adminPath(projectId), 'layout')
}

export async function addComment(
  projectId: string,
  postId: string,
  body: string,
  isInternal: boolean,
) {
  const ctx = await requireAuthContext()
  await comments.createComment(projectId, postId, { body, isInternal }, { memberId: ctx.memberId })
  revalidatePath(`${adminPath(projectId)}/posts/${postId}`)
}

export async function setPostTags(projectId: string, postId: string, tagIds: string[]) {
  const ctx = await requireAuthContext()
  await tags.setPostTags(ctx, projectId, postId, tagIds)
  revalidatePath(`${adminPath(projectId)}/posts/${postId}`)
}

export async function createTag(projectId: string, name: string, color: string) {
  const ctx = await requireAuthContext()
  await tags.createTag(ctx, projectId, { name, color })
  revalidatePath(adminPath(projectId), 'layout')
}

// --- Triage (Phase 12) ---
export async function setAssignee(projectId: string, postId: string, memberId: string | null) {
  const ctx = await requireAuthContext()
  await posts.updatePost(ctx, projectId, postId, { assigneeMemberId: memberId })
  revalidatePath(`${adminPath(projectId)}/posts/${postId}`)
}

export async function setPostScoreFields(
  projectId: string,
  postId: string,
  fields: Record<string, number>,
) {
  const ctx = await requireAuthContext()
  await posts.updatePost(ctx, projectId, postId, { fields })
  revalidatePath(`${adminPath(projectId)}/posts/${postId}`)
}

export async function voteForUser(projectId: string, postId: string, email: string) {
  const ctx = await requireAuthContext()
  await votes.voteForUser(ctx, projectId, postId, { email })
  revalidatePath(`${adminPath(projectId)}/posts/${postId}`)
}

export async function createScoreField(
  projectId: string,
  input: { key: string; label: string; weight: number },
) {
  const ctx = await requireAuthContext()
  await scoreFields.createScoreField(ctx, projectId, input)
  revalidatePath(adminPath(projectId), 'layout')
}

export async function deleteScoreField(projectId: string, id: string) {
  const ctx = await requireAuthContext()
  await scoreFields.deleteScoreField(ctx, projectId, id)
  revalidatePath(adminPath(projectId), 'layout')
}

export async function adminCreatePost(formData: FormData) {
  const ctx = await requireAuthContext()
  const projectId = String(formData.get('projectId'))
  await posts.createPost(ctx, projectId, {
    boardId: String(formData.get('boardId')),
    title: String(formData.get('title')),
    body: String(formData.get('body') ?? ''),
  })
  revalidatePath(`${adminPath(projectId)}/posts`)
}

// --- Boards / statuses ---
export async function createBoard(formData: FormData) {
  const ctx = await requireAuthContext()
  const projectId = String(formData.get('projectId'))
  await boards.createBoard(ctx, projectId, {
    name: String(formData.get('name')),
    slug: String(formData.get('slug')),
    kind: 'feature',
    isPrivate: false,
  })
  revalidatePath(adminPath(projectId), 'layout')
}

// --- Changelog ---
export async function saveChangelog(formData: FormData) {
  const ctx = await requireAuthContext()
  const projectId = String(formData.get('projectId'))
  const id = formData.get('id') ? String(formData.get('id')) : null
  const status = formData.get('publish') ? 'published' : 'draft'
  const payload = {
    title: String(formData.get('title')),
    body: String(formData.get('body') ?? ''),
    status: status as 'draft' | 'published',
    labels: String(formData.get('labels') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    linkedPostIds: [],
  }
  if (id) await changelog.updateChangelog(ctx, projectId, id, payload)
  else await changelog.createChangelog(ctx, projectId, payload)
  revalidatePath(`${adminPath(projectId)}/changelog`)
}

export async function deleteChangelog(projectId: string, id: string) {
  const ctx = await requireAuthContext()
  await changelog.deleteChangelog(ctx, projectId, id)
  revalidatePath(`${adminPath(projectId)}/changelog`)
}

// --- Settings ---
export async function updateProjectSettings(formData: FormData) {
  const ctx = await requireAuthContext()
  const projectId = String(formData.get('projectId'))
  await projects.updateProject(ctx, projectId, {
    name: String(formData.get('name')),
    allowedOrigins: String(formData.get('allowedOrigins') ?? '')
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean),
    widgetSettings: {
      primaryColor: String(formData.get('primaryColor') ?? '#6366f1'),
      theme: String(formData.get('theme') ?? 'light'),
      mode: String(formData.get('mode') ?? 'floating'),
    },
  })
  revalidatePath(`${adminPath(projectId)}/settings`)
}

export async function createProject(formData: FormData) {
  const ctx = await requireAuthContext()
  const project = await projects.createProject(ctx, {
    name: String(formData.get('name')),
    slug: String(formData.get('slug')),
    isPublic: true,
    allowedOrigins: [],
  })
  revalidatePath('/admin', 'layout')
  if (project) redirect(`/admin/${project.id}/posts`)
}

// --- Members ---
export async function inviteMember(formData: FormData) {
  const ctx = await requireAuthContext()
  const projectId = String(formData.get('projectId'))
  await members.inviteMember(ctx, {
    email: String(formData.get('email')),
    role: (String(formData.get('role')) || 'member') as 'owner' | 'admin' | 'member',
  })
  revalidatePath(`${adminPath(projectId)}/members`)
}

// --- API keys ---
export async function createApiKey(formData: FormData): Promise<string> {
  const ctx = await requireAuthContext()
  const projectId = String(formData.get('projectId'))
  const created = await apiKeys.createApiKey(ctx, projectId, {
    name: String(formData.get('name')),
    scopes: ['read', 'write'],
  })
  revalidatePath(`${adminPath(projectId)}/keys`)
  return created.key
}

export async function revokeApiKey(projectId: string, id: string) {
  const ctx = await requireAuthContext()
  await apiKeys.revokeApiKey(ctx, projectId, id)
  revalidatePath(`${adminPath(projectId)}/keys`)
}

// --- GitHub integration ---
export async function connectGithub(formData: FormData) {
  const ctx = await requireAuthContext()
  const projectId = String(formData.get('projectId'))
  await integrations.setGithubIntegration(ctx, projectId, {
    repo: String(formData.get('repo')).trim(),
    token: String(formData.get('token') ?? '').trim() || undefined,
    autoCreate: (String(formData.get('autoCreate') ?? 'off') || 'off') as 'off' | 'bug' | 'all',
  })
  revalidatePath(`${adminPath(projectId)}/settings`)
}

export async function disconnectGithub(projectId: string) {
  const ctx = await requireAuthContext()
  await integrations.removeGithubIntegration(ctx, projectId)
  revalidatePath(`${adminPath(projectId)}/settings`)
}

export async function createGithubIssue(projectId: string, postId: string) {
  const ctx = await requireAuthContext()
  const link = await integrations.createGithubIssue(ctx, projectId, postId)
  revalidatePath(`${adminPath(projectId)}/posts/${postId}`)
  return link
}

// --- Statuses (for reorder/roadmap toggle) ---
export async function toggleRoadmap(projectId: string, statusId: string, show: boolean) {
  const ctx = await requireAuthContext()
  await statuses.updateStatus(ctx, projectId, statusId, { showOnRoadmap: show })
  revalidatePath(adminPath(projectId), 'layout')
}
