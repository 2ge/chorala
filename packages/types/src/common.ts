import { z } from 'zod'

/** A prefixed-nanoid id, e.g. `post_V1Stgx...`. */
export const prefixedId = (prefix: string) =>
  z.string().regex(new RegExp(`^${prefix}_[0-9A-Za-z_-]+$`), `expected a ${prefix}_ id`)

/** ISO-8601 timestamp string (the serialized form sent over the API). */
export const isoDate = z.string()

/** Fields present on (almost) every entity in the serialized API contract. */
export const timestamps = z.object({
  createdAt: isoDate,
  updatedAt: isoDate,
})

// --- Enums (mirror SPEC §7) ---
export const orgPlan = z.enum(['free', 'starter', 'pro'])
// `moderator` (Phase 17): can run the moderation queue (hide/approve posts & comments) but
// cannot manage the org — billing, members, projects stay owner/admin-only.
export const memberRole = z.enum(['owner', 'admin', 'moderator', 'member'])
export const boardKind = z.enum(['feature', 'bug', 'general'])
export const statusKind = z.enum(['open', 'planned', 'in_progress', 'complete', 'closed'])
export const changelogStatus = z.enum(['draft', 'published'])
export const integrationType = z.enum(['slack', 'linear', 'github', 'discord', 'segment'])
export const aiJobKind = z.enum(['embed', 'dedup', 'cluster', 'summarize', 'translate'])
export const aiJobStatus = z.enum(['queued', 'running', 'done', 'error'])
export const webhookEvent = z.enum([
  'post.created',
  'post.status_changed',
  'post.merged',
  'comment.created',
  'changelog.published',
  'vote.created',
])
// `revenue` (Σ MRR of voters' companies) and `score` (weighted prioritization) are admin-only
// sorts; public lists fall back to `top`.
export const postSort = z.enum(['top', 'new', 'trending', 'oldest', 'revenue', 'score'])

export type OrgPlan = z.infer<typeof orgPlan>
export type MemberRole = z.infer<typeof memberRole>
export type BoardKind = z.infer<typeof boardKind>
export type StatusKind = z.infer<typeof statusKind>
export type ChangelogStatus = z.infer<typeof changelogStatus>
export type IntegrationType = z.infer<typeof integrationType>
export type AiJobKind = z.infer<typeof aiJobKind>
export type AiJobStatus = z.infer<typeof aiJobStatus>
export type WebhookEvent = z.infer<typeof webhookEvent>
export type PostSort = z.infer<typeof postSort>

/** Standard cursor/offset pagination query. */
export const paginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
})
export type PaginationQuery = z.infer<typeof paginationQuery>

/** A paginated list envelope. */
export const paginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    nextCursor: z.string().nullable(),
    total: z.number().int().optional(),
  })

/** The JSON error body returned by the API error middleware. */
export const apiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
})
export type ApiError = z.infer<typeof apiError>

// --- Surveys (Phase 16) ---
export const surveyType = z.enum(['nps', 'csat', 'ces', 'rating', 'text', 'choice'])

// Where a customer insight/quote came from (Phase 19 evidence linking).
export const insightSource = z.enum([
  'manual',
  'intercom',
  'zendesk',
  'email',
  'sales',
  'call',
  'other',
])
export type SurveyType = z.infer<typeof surveyType>

// --- Audience segments (Phase 13) ---
/** Attributes a segment rule can test (resolved over end_users + their company). */
export const segmentField = z.enum(['plan', 'mrr', 'locale', 'email_domain', 'has_company'])
export const segmentOp = z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte'])
export const segmentRule = z.object({
  field: segmentField,
  op: segmentOp,
  value: z.string(),
})
export const segmentDefinition = z.object({
  match: z.enum(['all', 'any']).default('all'),
  rules: z.array(segmentRule).max(20).default([]),
})
export type SegmentDefinition = z.infer<typeof segmentDefinition>

/** The end-user identity JWT payload the host app signs (SPEC §8.2). */
export const endUserJwtPayload = z.object({
  id: z.string().min(1),
  email: z.email().optional(),
  name: z.string().optional(),
  avatar: z.url().optional(),
  segment: z.record(z.string(), z.unknown()).optional(),
  // Optional B2B account this user belongs to — drives revenue-weighted prioritization.
  // `id` is your external company id (used to upsert + de-dupe); `mrr` in whole currency units.
  company: z
    .object({
      id: z.string().min(1),
      name: z.string().optional(),
      domain: z.string().optional(),
      mrr: z.number().int().nonnegative().optional(),
      plan: z.string().optional(),
    })
    .optional(),
})
export type EndUserJwtPayload = z.infer<typeof endUserJwtPayload>
