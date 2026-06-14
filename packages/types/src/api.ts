import { z } from 'zod'
import {
  boardKind,
  changelogStatus,
  integrationType,
  memberRole,
  paginationQuery,
  postSort,
  statusKind,
  webhookEvent,
} from './common.ts'
import { comment, endUser, post, postTranslation, status } from './entities.ts'

// =====================================================================
// Public / widget API (SPEC §8.2)
// =====================================================================

export const publicBoardsQuery = paginationQuery.extend({
  boardSlug: z.string().optional(),
  statusId: z.string().optional(),
  tagId: z.string().optional(),
  sort: postSort.default('top'),
  locale: z.string().optional(),
  search: z.string().optional(),
})
export type PublicBoardsQuery = z.infer<typeof publicBoardsQuery>

export const createPostInput = z.object({
  boardSlug: z.string().min(1),
  title: z.string().min(2).max(300),
  body: z.string().max(20_000).default(''),
  locale: z.string().optional(),
})
export type CreatePostInput = z.infer<typeof createPostInput>

export const createCommentInput = z.object({
  body: z.string().min(1).max(20_000),
  parentCommentId: z.string().optional(),
  isInternal: z.boolean().optional(),
})
export type CreateCommentInput = z.infer<typeof createCommentInput>

/** A post enriched for a localized public view. */
export const localizedPost = post.extend({
  hasVoted: z.boolean().optional(),
  displayLocale: z.string().optional(),
})
export type LocalizedPost = z.infer<typeof localizedPost>

export const postDetail = z.object({
  post: localizedPost,
  comments: z.array(comment),
  translations: z.array(postTranslation),
})
export type PostDetail = z.infer<typeof postDetail>

export const voteToggleResponse = z.object({
  voted: z.boolean(),
  voteCount: z.number().int(),
})
export type VoteToggleResponse = z.infer<typeof voteToggleResponse>

export const roadmapColumn = z.object({
  status: status,
  posts: z.array(localizedPost),
})
export const roadmapResponse = z.object({ columns: z.array(roadmapColumn) })
export type RoadmapResponse = z.infer<typeof roadmapResponse>

export const changelogSubscribeInput = z.object({ email: z.email() })
export type ChangelogSubscribeInput = z.infer<typeof changelogSubscribeInput>

export const identifyInput = z.object({ jwt: z.string().min(1) })
export type IdentifyInput = z.infer<typeof identifyInput>

export const identifyResponse = z.object({
  endUser: endUser,
  token: z.string(),
})
export type IdentifyResponse = z.infer<typeof identifyResponse>

// =====================================================================
// Admin / management API (SPEC §8.1)
// =====================================================================

export const createProjectInput = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers and hyphens only'),
  isPublic: z.boolean().default(true),
  allowedOrigins: z.array(z.string()).default([]),
})
export type CreateProjectInput = z.infer<typeof createProjectInput>

export const updateProjectInput = createProjectInput.partial().extend({
  customDomain: z.string().nullable().optional(),
  widgetSettings: z.record(z.string(), z.unknown()).optional(),
})
export type UpdateProjectInput = z.infer<typeof updateProjectInput>

export const createBoardInput = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  kind: boardKind.default('feature'),
  isPrivate: z.boolean().default(false),
})
export type CreateBoardInput = z.infer<typeof createBoardInput>
export const updateBoardInput = createBoardInput.partial()
export type UpdateBoardInput = z.infer<typeof updateBoardInput>

export const createStatusInput = z.object({
  name: z.string().min(1),
  color: z.string(),
  kind: statusKind,
  showOnRoadmap: z.boolean().default(false),
  position: z.number().int().optional(),
})
export type CreateStatusInput = z.infer<typeof createStatusInput>
export const updateStatusInput = createStatusInput.partial()
export type UpdateStatusInput = z.infer<typeof updateStatusInput>

export const adminCreatePostInput = z.object({
  boardId: z.string().min(1),
  title: z.string().min(2).max(300),
  body: z.string().max(20_000).default(''),
  statusId: z.string().optional(),
  locale: z.string().optional(),
})
export type AdminCreatePostInput = z.infer<typeof adminCreatePostInput>

export const updatePostInput = z.object({
  title: z.string().min(2).max(300).optional(),
  body: z.string().max(20_000).optional(),
  statusId: z.string().nullable().optional(),
  boardId: z.string().optional(),
  isPinned: z.boolean().optional(),
  eta: z.string().nullable().optional(),
})
export type UpdatePostInput = z.infer<typeof updatePostInput>

export const changePostStatusInput = z.object({ statusId: z.string().nullable() })
export const mergePostInput = z.object({ targetPostId: z.string().min(1) })
export const tagPostInput = z.object({ tagIds: z.array(z.string()) })

export const createTagInput = z.object({ name: z.string().min(1), color: z.string() })
export type CreateTagInput = z.infer<typeof createTagInput>

export const createChangelogInput = z.object({
  title: z.string().min(1),
  body: z.string(),
  status: changelogStatus.default('draft'),
  labels: z.array(z.string()).default([]),
  linkedPostIds: z.array(z.string()).default([]),
})
export type CreateChangelogInput = z.infer<typeof createChangelogInput>
export const updateChangelogInput = createChangelogInput.partial()
export type UpdateChangelogInput = z.infer<typeof updateChangelogInput>

export const createWebhookInput = z.object({
  url: z.url(),
  events: z.array(webhookEvent).min(1),
  isActive: z.boolean().default(true),
})
export type CreateWebhookInput = z.infer<typeof createWebhookInput>

export const createApiKeyInput = z.object({
  name: z.string().min(1),
  scopes: z.array(z.string()).default(['read']),
})
export type CreateApiKeyInput = z.infer<typeof createApiKeyInput>

/** Returned exactly once on creation — the only time the raw key is visible. */
export const createApiKeyResponse = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
  prefix: z.string(),
})
export type CreateApiKeyResponse = z.infer<typeof createApiKeyResponse>

export const createIntegrationInput = z.object({
  type: integrationType,
  config: z.record(z.string(), z.unknown()).default({}),
  secret: z.string().optional(),
})
export type CreateIntegrationInput = z.infer<typeof createIntegrationInput>

export const inviteMemberInput = z.object({
  email: z.email(),
  role: memberRole.default('member'),
})
export type InviteMemberInput = z.infer<typeof inviteMemberInput>

export const updateMemberInput = z.object({ role: memberRole })
export type UpdateMemberInput = z.infer<typeof updateMemberInput>

export const updateOrgSettingsInput = z.object({
  name: z.string().min(1).optional(),
  defaultLocale: z.string().optional(),
  locales: z.array(z.string()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
})
export type UpdateOrgSettingsInput = z.infer<typeof updateOrgSettingsInput>

// --- Analytics ---
export const analyticsQuery = z.object({
  boardId: z.string().optional(),
  timeframe: z.enum(['7d', '30d', '90d', 'all']).default('30d'),
})
export type AnalyticsQuery = z.infer<typeof analyticsQuery>

export const analyticsResponse = z.object({
  topPosts: z.array(z.object({ post: post, voteCount: z.number().int() })),
  voteVelocity: z.array(z.object({ date: z.string(), votes: z.number().int() })),
  clusterThemes: z.array(z.object({ label: z.string(), summary: z.string(), count: z.number() })),
})
export type AnalyticsResponse = z.infer<typeof analyticsResponse>
