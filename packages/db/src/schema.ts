import { VECTOR_DIM } from '@heed/config'
import { sql } from 'drizzle-orm'
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  vector,
} from 'drizzle-orm/pg-core'
import { newId } from './ids.ts'

type Json = Record<string, unknown>

/** created_at / updated_at present on (almost) every table. */
const ts = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}

const pk = (entity: Parameters<typeof newId>[0]) =>
  text('id')
    .primaryKey()
    .$defaultFn(() => newId(entity))

// =====================================================================
// Better Auth tables (managed by Better Auth; mapped to these names in §2 wiring)
// =====================================================================
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  ...ts,
})

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  ...ts,
})

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  ...ts,
})

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ...ts,
})

// =====================================================================
// Tenancy & people
// =====================================================================
export const organizations = pgTable('organizations', {
  id: pk('organization'),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  plan: text('plan').$type<'free' | 'starter' | 'pro'>().default('free').notNull(),
  defaultLocale: text('default_locale').default('en').notNull(),
  locales: text('locales').array().default(['en']).notNull(),
  settings: jsonb('settings').$type<Json>().default({}).notNull(),
  ...ts,
})

export const members = pgTable(
  'members',
  {
    id: pk('member'),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').$type<'owner' | 'admin' | 'member'>().default('member').notNull(),
    ...ts,
  },
  (t) => [
    unique('members_org_user_uq').on(t.orgId, t.userId),
    index('members_user_idx').on(t.userId),
  ],
)

export const projects = pgTable(
  'projects',
  {
    id: pk('project'),
    orgId: text('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    isPublic: boolean('is_public').default(true).notNull(),
    customDomain: text('custom_domain'),
    publicKey: text('public_key').notNull().unique(),
    endUserJwtSecret: text('end_user_jwt_secret').notNull(),
    allowedOrigins: text('allowed_origins').array().default([]).notNull(),
    widgetSettings: jsonb('widget_settings').$type<Json>().default({}).notNull(),
    ...ts,
  },
  (t) => [
    unique('projects_org_slug_uq').on(t.orgId, t.slug),
    uniqueIndex('projects_custom_domain_uq')
      .on(t.customDomain)
      .where(sql`${t.customDomain} is not null`),
  ],
)

export const endUsers = pgTable(
  'end_users',
  {
    id: pk('endUser'),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    externalId: text('external_id'),
    email: text('email'),
    name: text('name'),
    avatarUrl: text('avatar_url'),
    isAnonymous: boolean('is_anonymous').default(true).notNull(),
    locale: text('locale').default('en').notNull(),
    metadata: jsonb('metadata').$type<Json>().default({}).notNull(),
    segment: jsonb('segment').$type<Json>().default({}).notNull(),
    ...ts,
  },
  (t) => [
    uniqueIndex('end_users_project_external_uq')
      .on(t.projectId, t.externalId)
      .where(sql`${t.externalId} is not null`),
    uniqueIndex('end_users_project_email_uq')
      .on(t.projectId, t.email)
      .where(sql`${t.email} is not null`),
  ],
)

// =====================================================================
// Feedback
// =====================================================================
export const boards = pgTable(
  'boards',
  {
    id: pk('board'),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    kind: text('kind').$type<'feature' | 'bug' | 'general'>().default('feature').notNull(),
    isPrivate: boolean('is_private').default(false).notNull(),
    position: integer('position').default(0).notNull(),
    ...ts,
  },
  (t) => [unique('boards_project_slug_uq').on(t.projectId, t.slug)],
)

export const statuses = pgTable(
  'statuses',
  {
    id: pk('status'),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull(),
    kind: text('kind')
      .$type<'open' | 'planned' | 'in_progress' | 'complete' | 'closed'>()
      .notNull(),
    position: integer('position').default(0).notNull(),
    showOnRoadmap: boolean('show_on_roadmap').default(false).notNull(),
    ...ts,
  },
  (t) => [index('statuses_project_idx').on(t.projectId)],
)

export const posts = pgTable(
  'posts',
  {
    id: pk('post'),
    boardId: text('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    authorEndUserId: text('author_end_user_id').references(() => endUsers.id, {
      onDelete: 'set null',
    }),
    authorMemberId: text('author_member_id').references(() => members.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    body: text('body').default('').notNull(),
    originalLocale: text('original_locale').default('en').notNull(),
    statusId: text('status_id').references(() => statuses.id, { onDelete: 'set null' }),
    isPinned: boolean('is_pinned').default(false).notNull(),
    voteCount: integer('vote_count').default(0).notNull(),
    commentCount: integer('comment_count').default(0).notNull(),
    embedding: vector('embedding', { dimensions: VECTOR_DIM }),
    mergedIntoPostId: text('merged_into_post_id').references((): AnyPgColumn => posts.id, {
      onDelete: 'set null',
    }),
    eta: timestamp('eta', { withTimezone: true }),
    ...ts,
  },
  (t) => [
    index('posts_board_idx').on(t.boardId),
    index('posts_project_idx').on(t.projectId),
    index('posts_status_idx').on(t.statusId),
    index('posts_embedding_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
  ],
)

export const postTranslations = pgTable(
  'post_translations',
  {
    id: pk('postTranslation'),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull(),
    title: text('title').notNull(),
    body: text('body').default('').notNull(),
    isAuto: boolean('is_auto').default(true).notNull(),
    ...ts,
  },
  (t) => [unique('post_translations_post_locale_uq').on(t.postId, t.locale)],
)

export const votes = pgTable(
  'votes',
  {
    id: pk('vote'),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    endUserId: text('end_user_id')
      .notNull()
      .references(() => endUsers.id, { onDelete: 'cascade' }),
    weight: integer('weight').default(1).notNull(),
    ...ts,
  },
  (t) => [
    unique('votes_post_user_uq').on(t.postId, t.endUserId),
    index('votes_post_idx').on(t.postId),
  ],
)

export const comments = pgTable(
  'comments',
  {
    id: pk('comment'),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    authorEndUserId: text('author_end_user_id').references(() => endUsers.id, {
      onDelete: 'set null',
    }),
    authorMemberId: text('author_member_id').references(() => members.id, { onDelete: 'set null' }),
    parentCommentId: text('parent_comment_id').references((): AnyPgColumn => comments.id, {
      onDelete: 'cascade',
    }),
    body: text('body').notNull(),
    isInternal: boolean('is_internal').default(false).notNull(),
    ...ts,
  },
  (t) => [index('comments_post_idx').on(t.postId)],
)

export const tags = pgTable(
  'tags',
  {
    id: pk('tag'),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull(),
    ...ts,
  },
  (t) => [unique('tags_project_name_uq').on(t.projectId, t.name)],
)

export const postTags = pgTable(
  'post_tags',
  {
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] })],
)

// =====================================================================
// Communication
// =====================================================================
export const changelogEntries = pgTable(
  'changelog_entries',
  {
    id: pk('changelogEntry'),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    body: text('body').default('').notNull(),
    status: text('status').$type<'draft' | 'published'>().default('draft').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    labels: text('labels').array().default([]).notNull(),
    linkedPostIds: text('linked_post_ids').array().default([]).notNull(),
    ...ts,
  },
  (t) => [index('changelog_project_idx').on(t.projectId)],
)

export const changelogSubscribers = pgTable(
  'changelog_subscribers',
  {
    id: pk('changelogSubscriber'),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    endUserId: text('end_user_id').references(() => endUsers.id, { onDelete: 'set null' }),
    ...ts,
  },
  (t) => [unique('changelog_subs_project_email_uq').on(t.projectId, t.email)],
)

export const notifications = pgTable('notifications', {
  id: pk('notification'),
  recipientType: text('recipient_type').$type<'member' | 'end_user'>().notNull(),
  recipientId: text('recipient_id').notNull(),
  type: text('type').notNull(),
  payload: jsonb('payload').$type<Json>().default({}).notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  ...ts,
})

// =====================================================================
// Integration & platform
// =====================================================================
export const integrations = pgTable('integrations', {
  id: pk('integration'),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  type: text('type').$type<'slack' | 'linear' | 'github'>().notNull(),
  config: jsonb('config').$type<Json>().default({}).notNull(),
  secret: text('secret'),
  ...ts,
})

export const webhooks = pgTable('webhooks', {
  id: pk('webhook'),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  events: text('events').array().default([]).notNull(),
  secret: text('secret').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  ...ts,
})

export const apiKeys = pgTable(
  'api_keys',
  {
    id: pk('apiKey'),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    hashedKey: text('hashed_key').notNull().unique(),
    prefix: text('prefix').notNull(),
    scopes: text('scopes').array().default(['read']).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    ...ts,
  },
  (t) => [index('api_keys_project_idx').on(t.projectId)],
)

export const auditLog = pgTable('audit_log', {
  id: pk('auditLog'),
  orgId: text('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  actor: text('actor').notNull(),
  action: text('action').notNull(),
  target: text('target').notNull(),
  metadata: jsonb('metadata').$type<Json>().default({}).notNull(),
  ...ts,
})

export const aiJobs = pgTable('ai_jobs', {
  id: pk('aiJob'),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  kind: text('kind').$type<'embed' | 'dedup' | 'cluster' | 'summarize' | 'translate'>().notNull(),
  status: text('status')
    .$type<'queued' | 'running' | 'done' | 'error'>()
    .default('queued')
    .notNull(),
  inputRef: text('input_ref'),
  result: jsonb('result').$type<Json>(),
  error: text('error'),
  ...ts,
})

export const feedbackClusters = pgTable('feedback_clusters', {
  id: pk('cluster'),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  summary: text('summary').default('').notNull(),
  postIds: text('post_ids').array().default([]).notNull(),
  centroid: vector('centroid', { dimensions: VECTOR_DIM }),
  computedAt: timestamp('computed_at', { withTimezone: true }),
  ...ts,
})
