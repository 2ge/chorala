import { env } from '@chorala/config'
import * as T from '@chorala/types'
import { z } from 'zod'

/**
 * OpenAPI 3.1 document generated from the zod contract in `@chorala/types` plus a compact
 * route table. Served at `GET /api/v1/openapi.json` and rendered at `/docs`.
 * Keep the route table below in sync when routes change — the schemas stay automatic.
 */

type Io = 'input' | 'output'
type ZodAny = z.ZodType

// --- component schemas: name -> [zod schema, input|output] ---
const COMPONENTS: Record<string, [ZodAny, Io]> = {
  // entities (responses)
  Post: [T.post, 'output'],
  LocalizedPost: [T.localizedPost, 'output'],
  Attachment: [T.attachment, 'output'],
  AttachmentRef: [T.attachmentRef, 'output'],
  Board: [T.board, 'output'],
  Status: [T.status, 'output'],
  Comment: [T.comment, 'output'],
  EndUser: [T.endUser, 'output'],
  Project: [T.project, 'output'],
  Tag: [T.tag, 'output'],
  Company: [T.company, 'output'],
  CompanyWithStats: [T.companyWithStats, 'output'],
  ScoreField: [T.scoreField, 'output'],
  Segment: [T.segment, 'output'],
  SegmentWithCount: [T.segmentWithCount, 'output'],
  AdminPostListItem: [T.adminPostListItem, 'output'],
  ChangelogEntry: [T.changelogEntry, 'output'],
  Member: [T.member, 'output'],
  Organization: [T.organization, 'output'],
  // composite responses
  PostDetail: [T.postDetail, 'output'],
  VoteToggleResponse: [T.voteToggleResponse, 'output'],
  RoadmapResponse: [T.roadmapResponse, 'output'],
  AnalyticsResponse: [T.analyticsResponse, 'output'],
  IdentifyResponse: [T.identifyResponse, 'output'],
  CreateApiKeyResponse: [T.createApiKeyResponse, 'output'],
  // request inputs
  CreatePostInput: [T.createPostInput, 'input'],
  CreateAttachmentInput: [T.createAttachmentInput, 'input'],
  CreateCommentInput: [T.createCommentInput, 'input'],
  ChangelogSubscribeInput: [T.changelogSubscribeInput, 'input'],
  IdentifyInput: [T.identifyInput, 'input'],
  CreateProjectInput: [T.createProjectInput, 'input'],
  UpdateProjectInput: [T.updateProjectInput, 'input'],
  CreateBoardInput: [T.createBoardInput, 'input'],
  UpdateBoardInput: [T.updateBoardInput, 'input'],
  CreateStatusInput: [T.createStatusInput, 'input'],
  UpdateStatusInput: [T.updateStatusInput, 'input'],
  AdminCreatePostInput: [T.adminCreatePostInput, 'input'],
  UpdatePostInput: [T.updatePostInput, 'input'],
  ChangePostStatusInput: [T.changePostStatusInput, 'input'],
  MergePostInput: [T.mergePostInput, 'input'],
  TagPostInput: [T.tagPostInput, 'input'],
  CreateTagInput: [T.createTagInput, 'input'],
  UpdateCompanyInput: [T.updateCompanyInput, 'input'],
  CreateScoreFieldInput: [T.createScoreFieldInput, 'input'],
  UpdateScoreFieldInput: [T.updateScoreFieldInput, 'input'],
  VoteForInput: [T.voteForInput, 'input'],
  CreateSegmentInput: [T.createSegmentInput, 'input'],
  UpdateSegmentInput: [T.updateSegmentInput, 'input'],
  SegmentDefinition: [T.segmentDefinition, 'input'],
  IngestInput: [T.ingestInput, 'input'],
  AskInput: [T.askInput, 'input'],
  CreateChangelogInput: [T.createChangelogInput, 'input'],
  UpdateChangelogInput: [T.updateChangelogInput, 'input'],
  CreateApiKeyInput: [T.createApiKeyInput, 'input'],
  InviteMemberInput: [T.inviteMemberInput, 'input'],
  UpdateMemberInput: [T.updateMemberInput, 'input'],
  UpdateOrgSettingsInput: [T.updateOrgSettingsInput, 'input'],
}

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })
const arr = (name: string) => ({ type: 'array', items: ref(name) })

type Route = {
  method: 'get' | 'post' | 'patch' | 'delete'
  path: string
  tag: string
  summary: string
  sec: 'public' | 'admin'
  body?: string
  resp?: object
  status?: number
}

// path params (e.g. {projectId}) -> OpenAPI parameters
function params(path: string) {
  return [...path.matchAll(/\{(\w+)\}/g)].map((m) => ({
    name: m[1],
    in: 'path',
    required: true,
    schema: { type: 'string' },
  }))
}

const ROUTES: Route[] = [
  // --- Public / widget ---
  {
    method: 'get',
    path: '/public/boards',
    tag: 'Public',
    sec: 'public',
    summary: 'List boards + ranked posts',
    resp: { type: 'object', properties: { boards: arr('Board'), posts: arr('LocalizedPost') } },
  },
  {
    method: 'get',
    path: '/public/posts/{id}',
    tag: 'Public',
    sec: 'public',
    summary: 'Get a post + comments',
    resp: ref('PostDetail'),
  },
  {
    method: 'post',
    path: '/public/posts',
    tag: 'Public',
    sec: 'public',
    summary: 'Submit a post',
    body: 'CreatePostInput',
    resp: ref('LocalizedPost'),
    status: 201,
  },
  {
    method: 'post',
    path: '/public/attachments',
    tag: 'Public',
    sec: 'public',
    summary: 'Upload a screenshot (link via createPost attachmentIds)',
    body: 'CreateAttachmentInput',
    resp: ref('AttachmentRef'),
    status: 201,
  },
  {
    method: 'post',
    path: '/public/posts/{id}/vote',
    tag: 'Public',
    sec: 'public',
    summary: 'Cast a vote',
    resp: ref('VoteToggleResponse'),
  },
  {
    method: 'delete',
    path: '/public/posts/{id}/vote',
    tag: 'Public',
    sec: 'public',
    summary: 'Remove a vote',
    resp: ref('VoteToggleResponse'),
  },
  {
    method: 'post',
    path: '/public/posts/{id}/comments',
    tag: 'Public',
    sec: 'public',
    summary: 'Add a comment',
    body: 'CreateCommentInput',
    resp: ref('Comment'),
    status: 201,
  },
  {
    method: 'get',
    path: '/public/roadmap',
    tag: 'Public',
    sec: 'public',
    summary: 'Public roadmap',
    resp: ref('RoadmapResponse'),
  },
  {
    method: 'get',
    path: '/public/changelog',
    tag: 'Public',
    sec: 'public',
    summary: 'Public changelog',
    resp: arr('ChangelogEntry'),
  },
  {
    method: 'post',
    path: '/public/changelog/subscribe',
    tag: 'Public',
    sec: 'public',
    summary: 'Subscribe to the changelog',
    body: 'ChangelogSubscribeInput',
    status: 201,
  },
  {
    method: 'post',
    path: '/public/identify',
    tag: 'Public',
    sec: 'public',
    summary: 'Identify an end-user (SSO)',
    body: 'IdentifyInput',
    resp: ref('IdentifyResponse'),
  },

  // --- Projects ---
  {
    method: 'get',
    path: '/projects',
    tag: 'Projects',
    sec: 'admin',
    summary: 'List projects',
    resp: arr('Project'),
  },
  {
    method: 'post',
    path: '/projects',
    tag: 'Projects',
    sec: 'admin',
    summary: 'Create a project',
    body: 'CreateProjectInput',
    resp: ref('Project'),
    status: 201,
  },
  {
    method: 'get',
    path: '/projects/{id}',
    tag: 'Projects',
    sec: 'admin',
    summary: 'Get a project',
    resp: ref('Project'),
  },
  {
    method: 'patch',
    path: '/projects/{id}',
    tag: 'Projects',
    sec: 'admin',
    summary: 'Update a project',
    body: 'UpdateProjectInput',
    resp: ref('Project'),
  },
  {
    method: 'delete',
    path: '/projects/{id}',
    tag: 'Projects',
    sec: 'admin',
    summary: 'Delete a project',
  },

  // --- Boards ---
  {
    method: 'get',
    path: '/projects/{projectId}/boards',
    tag: 'Boards',
    sec: 'admin',
    summary: 'List boards',
    resp: arr('Board'),
  },
  {
    method: 'post',
    path: '/projects/{projectId}/boards',
    tag: 'Boards',
    sec: 'admin',
    summary: 'Create a board',
    body: 'CreateBoardInput',
    resp: ref('Board'),
    status: 201,
  },
  {
    method: 'get',
    path: '/projects/{projectId}/boards/{id}',
    tag: 'Boards',
    sec: 'admin',
    summary: 'Get a board',
    resp: ref('Board'),
  },
  {
    method: 'patch',
    path: '/projects/{projectId}/boards/{id}',
    tag: 'Boards',
    sec: 'admin',
    summary: 'Update a board',
    body: 'UpdateBoardInput',
    resp: ref('Board'),
  },
  {
    method: 'delete',
    path: '/projects/{projectId}/boards/{id}',
    tag: 'Boards',
    sec: 'admin',
    summary: 'Delete a board',
  },

  // --- Statuses ---
  {
    method: 'get',
    path: '/projects/{projectId}/statuses',
    tag: 'Statuses',
    sec: 'admin',
    summary: 'List statuses',
    resp: arr('Status'),
  },
  {
    method: 'post',
    path: '/projects/{projectId}/statuses',
    tag: 'Statuses',
    sec: 'admin',
    summary: 'Create a status',
    body: 'CreateStatusInput',
    resp: ref('Status'),
    status: 201,
  },
  {
    method: 'patch',
    path: '/projects/{projectId}/statuses/{id}',
    tag: 'Statuses',
    sec: 'admin',
    summary: 'Update a status',
    body: 'UpdateStatusInput',
    resp: ref('Status'),
  },
  {
    method: 'delete',
    path: '/projects/{projectId}/statuses/{id}',
    tag: 'Statuses',
    sec: 'admin',
    summary: 'Delete a status',
  },

  // --- Posts (admin) ---
  {
    method: 'get',
    path: '/projects/{projectId}/posts',
    tag: 'Posts',
    sec: 'admin',
    summary:
      'List posts (filters: board/status/appVersion/company/plan/minMrr/assignee; sort incl. revenue, score; ?format=csv exports)',
    resp: arr('AdminPostListItem'),
  },
  {
    method: 'post',
    path: '/projects/{projectId}/posts',
    tag: 'Posts',
    sec: 'admin',
    summary: 'Create a post',
    body: 'AdminCreatePostInput',
    resp: ref('Post'),
    status: 201,
  },
  {
    method: 'get',
    path: '/projects/{projectId}/posts/{id}',
    tag: 'Posts',
    sec: 'admin',
    summary: 'Get a post',
    resp: ref('PostDetail'),
  },
  {
    method: 'get',
    path: '/projects/{projectId}/posts/{id}/context',
    tag: 'Posts',
    sec: 'admin',
    summary: 'Submission context (appVersion + metadata map)',
    resp: {
      type: 'object',
      properties: {
        appVersion: { type: 'string', nullable: true },
        context: { type: 'object', additionalProperties: true },
      },
    },
  },
  {
    method: 'get',
    path: '/projects/{projectId}/posts/{id}/attachments',
    tag: 'Posts',
    sec: 'admin',
    summary: 'List a post’s attachments (screenshots)',
    resp: arr('Attachment'),
  },
  {
    method: 'get',
    path: '/projects/{projectId}/posts/{id}/customer',
    tag: 'Posts',
    sec: 'admin',
    summary: 'The post author’s end-user + company (revenue context)',
  },
  {
    method: 'post',
    path: '/projects/{projectId}/posts/{id}/vote-for',
    tag: 'Posts',
    sec: 'admin',
    summary: 'Vote on behalf of a customer (by email / externalId)',
    body: 'VoteForInput',
    resp: ref('VoteToggleResponse'),
  },
  {
    method: 'patch',
    path: '/projects/{projectId}/posts/{id}',
    tag: 'Posts',
    sec: 'admin',
    summary: 'Update a post',
    body: 'UpdatePostInput',
    resp: ref('Post'),
  },
  {
    method: 'delete',
    path: '/projects/{projectId}/posts/{id}',
    tag: 'Posts',
    sec: 'admin',
    summary: 'Delete a post',
  },
  {
    method: 'post',
    path: '/projects/{projectId}/posts/{id}/status',
    tag: 'Posts',
    sec: 'admin',
    summary: 'Change status (moves on roadmap)',
    body: 'ChangePostStatusInput',
    resp: ref('Post'),
  },
  {
    method: 'post',
    path: '/projects/{projectId}/posts/{id}/pin',
    tag: 'Posts',
    sec: 'admin',
    summary: 'Toggle pin',
    resp: ref('Post'),
  },
  {
    method: 'post',
    path: '/projects/{projectId}/posts/{id}/merge',
    tag: 'Posts',
    sec: 'admin',
    summary: 'Merge into another post',
    body: 'MergePostInput',
    resp: ref('Post'),
  },
  {
    method: 'post',
    path: '/projects/{projectId}/posts/{id}/tags',
    tag: 'Posts',
    sec: 'admin',
    summary: 'Set tags',
    body: 'TagPostInput',
    resp: ref('Post'),
  },

  // --- Comments (admin) ---
  {
    method: 'get',
    path: '/projects/{projectId}/posts/{postId}/comments',
    tag: 'Comments',
    sec: 'admin',
    summary: 'List comments',
    resp: arr('Comment'),
  },
  {
    method: 'post',
    path: '/projects/{projectId}/posts/{postId}/comments',
    tag: 'Comments',
    sec: 'admin',
    summary: 'Add a comment',
    body: 'CreateCommentInput',
    resp: ref('Comment'),
    status: 201,
  },
  {
    method: 'delete',
    path: '/projects/{projectId}/posts/{postId}/comments/{id}',
    tag: 'Comments',
    sec: 'admin',
    summary: 'Delete a comment',
  },

  // --- Tags ---
  {
    method: 'get',
    path: '/projects/{projectId}/tags',
    tag: 'Tags',
    sec: 'admin',
    summary: 'List tags',
    resp: arr('Tag'),
  },
  {
    method: 'post',
    path: '/projects/{projectId}/tags',
    tag: 'Tags',
    sec: 'admin',
    summary: 'Create a tag',
    body: 'CreateTagInput',
    resp: ref('Tag'),
    status: 201,
  },
  {
    method: 'delete',
    path: '/projects/{projectId}/tags/{id}',
    tag: 'Tags',
    sec: 'admin',
    summary: 'Delete a tag',
  },

  // --- Companies (B2B revenue intelligence) ---
  {
    method: 'get',
    path: '/projects/{projectId}/companies',
    tag: 'Companies',
    sec: 'admin',
    summary: 'List companies + rollups (users, posts), richest first',
    resp: arr('CompanyWithStats'),
  },
  {
    method: 'get',
    path: '/projects/{projectId}/companies/{id}',
    tag: 'Companies',
    sec: 'admin',
    summary: 'Get a company',
    resp: ref('Company'),
  },
  {
    method: 'patch',
    path: '/projects/{projectId}/companies/{id}',
    tag: 'Companies',
    sec: 'admin',
    summary: 'Edit a company (mrr / plan / name / domain)',
    body: 'UpdateCompanyInput',
    resp: ref('Company'),
  },

  // --- Score fields (weighted prioritization) ---
  {
    method: 'get',
    path: '/projects/{projectId}/score-fields',
    tag: 'Score fields',
    sec: 'admin',
    summary: 'List weighted prioritization fields',
    resp: arr('ScoreField'),
  },
  {
    method: 'post',
    path: '/projects/{projectId}/score-fields',
    tag: 'Score fields',
    sec: 'admin',
    summary: 'Create a score field { key, label, weight }',
    body: 'CreateScoreFieldInput',
    resp: ref('ScoreField'),
    status: 201,
  },
  {
    method: 'patch',
    path: '/projects/{projectId}/score-fields/{id}',
    tag: 'Score fields',
    sec: 'admin',
    summary: 'Update a score field',
    body: 'UpdateScoreFieldInput',
    resp: ref('ScoreField'),
  },
  {
    method: 'delete',
    path: '/projects/{projectId}/score-fields/{id}',
    tag: 'Score fields',
    sec: 'admin',
    summary: 'Delete a score field',
  },

  // --- Segments (audience targeting) ---
  {
    method: 'get',
    path: '/projects/{projectId}/segments',
    tag: 'Segments',
    sec: 'admin',
    summary: 'List segments + how many end-users match each',
    resp: arr('SegmentWithCount'),
  },
  {
    method: 'post',
    path: '/projects/{projectId}/segments/preview',
    tag: 'Segments',
    sec: 'admin',
    summary: 'Live match count for an unsaved definition',
    body: 'SegmentDefinition',
    resp: { type: 'object', properties: { matchCount: { type: 'integer' } } },
  },
  {
    method: 'post',
    path: '/projects/{projectId}/segments',
    tag: 'Segments',
    sec: 'admin',
    summary: 'Create a segment',
    body: 'CreateSegmentInput',
    resp: ref('Segment'),
    status: 201,
  },
  {
    method: 'get',
    path: '/projects/{projectId}/segments/{id}',
    tag: 'Segments',
    sec: 'admin',
    summary: 'Get a segment',
    resp: ref('Segment'),
  },
  {
    method: 'patch',
    path: '/projects/{projectId}/segments/{id}',
    tag: 'Segments',
    sec: 'admin',
    summary: 'Update a segment',
    body: 'UpdateSegmentInput',
    resp: ref('Segment'),
  },
  {
    method: 'delete',
    path: '/projects/{projectId}/segments/{id}',
    tag: 'Segments',
    sec: 'admin',
    summary: 'Delete a segment',
  },

  // --- Changelog (admin) ---
  {
    method: 'get',
    path: '/projects/{projectId}/changelog',
    tag: 'Changelog',
    sec: 'admin',
    summary: 'List entries',
    resp: arr('ChangelogEntry'),
  },
  {
    method: 'post',
    path: '/projects/{projectId}/changelog',
    tag: 'Changelog',
    sec: 'admin',
    summary: 'Create an entry',
    body: 'CreateChangelogInput',
    resp: ref('ChangelogEntry'),
    status: 201,
  },
  {
    method: 'patch',
    path: '/projects/{projectId}/changelog/{id}',
    tag: 'Changelog',
    sec: 'admin',
    summary: 'Update an entry',
    body: 'UpdateChangelogInput',
    resp: ref('ChangelogEntry'),
  },
  {
    method: 'delete',
    path: '/projects/{projectId}/changelog/{id}',
    tag: 'Changelog',
    sec: 'admin',
    summary: 'Delete an entry',
  },

  // --- API keys ---
  {
    method: 'get',
    path: '/projects/{projectId}/keys',
    tag: 'API keys',
    sec: 'admin',
    summary: 'List API keys',
  },
  {
    method: 'post',
    path: '/projects/{projectId}/keys',
    tag: 'API keys',
    sec: 'admin',
    summary: 'Create an API key (raw key shown once)',
    body: 'CreateApiKeyInput',
    resp: ref('CreateApiKeyResponse'),
    status: 201,
  },
  {
    method: 'delete',
    path: '/projects/{projectId}/keys/{id}',
    tag: 'API keys',
    sec: 'admin',
    summary: 'Revoke an API key',
  },

  // --- Analytics + AI ---
  {
    method: 'get',
    path: '/projects/{projectId}/analytics',
    tag: 'Analytics',
    sec: 'admin',
    summary: 'Analytics (top posts, velocity, themes)',
    resp: ref('AnalyticsResponse'),
  },
  {
    method: 'get',
    path: '/projects/{projectId}/posts/search',
    tag: 'AI',
    sec: 'admin',
    summary: 'Semantic search',
    resp: arr('Post'),
  },
  {
    method: 'post',
    path: '/projects/{projectId}/posts/{id}/summarize',
    tag: 'AI',
    sec: 'admin',
    summary: 'Summarize a thread',
  },
  {
    method: 'post',
    path: '/projects/{projectId}/changelog/draft',
    tag: 'AI',
    sec: 'admin',
    summary: 'Draft a changelog from posts',
  },
  {
    method: 'post',
    path: '/projects/{projectId}/ingest',
    tag: 'AI',
    sec: 'admin',
    summary: 'Autopilot: ingest a support conversation → AI extracts pending posts',
    body: 'IngestInput',
    status: 201,
  },
  {
    method: 'post',
    path: '/projects/{projectId}/ask',
    tag: 'AI',
    sec: 'admin',
    summary: 'Ask a natural-language question over your feedback',
    body: 'AskInput',
  },
  {
    method: 'post',
    path: '/projects/{projectId}/posts/{id}/approve',
    tag: 'Posts',
    sec: 'admin',
    summary: 'Approve a pending AI-ingested post (→ live)',
    resp: ref('AdminPostListItem'),
  },
  {
    method: 'post',
    path: '/projects/{projectId}/posts/{id}/dismiss',
    tag: 'Posts',
    sec: 'admin',
    summary: 'Dismiss a pending AI-ingested post',
  },

  // --- Org ---
  {
    method: 'get',
    path: '/org',
    tag: 'Organization',
    sec: 'admin',
    summary: 'Current organization',
    resp: ref('Organization'),
  },
  {
    method: 'patch',
    path: '/org',
    tag: 'Organization',
    sec: 'admin',
    summary: 'Update org settings',
    body: 'UpdateOrgSettingsInput',
    resp: ref('Organization'),
  },
  {
    method: 'get',
    path: '/org/members',
    tag: 'Organization',
    sec: 'admin',
    summary: 'List members',
    resp: arr('Member'),
  },
  {
    method: 'post',
    path: '/org/members',
    tag: 'Organization',
    sec: 'admin',
    summary: 'Invite a member',
    body: 'InviteMemberInput',
    resp: ref('Member'),
    status: 201,
  },
  {
    method: 'patch',
    path: '/org/members/{id}',
    tag: 'Organization',
    sec: 'admin',
    summary: 'Change a member role',
    body: 'UpdateMemberInput',
    resp: ref('Member'),
  },
  {
    method: 'delete',
    path: '/org/members/{id}',
    tag: 'Organization',
    sec: 'admin',
    summary: 'Remove a member',
  },
]

let cached: object | null = null

export function openapiDocument(): object {
  if (cached) return cached

  const schemas: Record<string, unknown> = {
    Error: {
      type: 'object',
      properties: {
        error: {
          type: 'object',
          properties: { code: { type: 'string' }, message: { type: 'string' } },
        },
      },
    },
  }
  for (const [name, [schema, io]] of Object.entries(COMPONENTS)) {
    const js = z.toJSONSchema(schema, { io }) as Record<string, unknown>
    delete js.$schema
    schemas[name] = js
  }

  const paths: Record<string, Record<string, unknown>> = {}
  const errResp = (code: string) => ({
    description: code,
    content: { 'application/json': { schema: ref('Error') } },
  })

  for (const r of ROUTES) {
    const op: Record<string, unknown> = {
      tags: [r.tag],
      summary: r.summary,
      security: r.sec === 'public' ? [{ PublicKey: [] }] : [{ ApiKey: [] }, { Session: [] }],
      parameters: params(r.path),
      responses: {
        [String(r.status ?? 200)]: r.resp
          ? { description: 'OK', content: { 'application/json': { schema: r.resp } } }
          : { description: 'OK' },
        '400': errResp('Bad request'),
        '401': errResp('Unauthorized'),
        '404': errResp('Not found'),
      },
    }
    if (r.body) {
      op.requestBody = {
        required: true,
        content: { 'application/json': { schema: ref(r.body) } },
      }
    }
    const p = r.path
    paths[p] = paths[p] ?? {}
    paths[p][r.method] = op
  }

  cached = {
    openapi: '3.1.0',
    info: {
      title: 'Chorala API',
      version: '1.0.0',
      description:
        'Open-core product-feedback platform. Public/widget API (X-Chorala-Key), admin API (hk_ key or session), end-user SSO, webhooks. Full prose reference: /docs and docs/API.md.',
      license: { name: 'AGPL-3.0' },
    },
    externalDocs: {
      url: `${env.CHORALA_PUBLIC_URL}/docs`,
      description: 'Interactive API reference',
    },
    servers: [{ url: `${env.CHORALA_PUBLIC_URL}/api/v1`, description: 'This instance' }],
    security: [{ PublicKey: [] }],
    tags: [...new Set(ROUTES.map((r) => r.tag))].map((name) => ({ name })),
    paths,
    components: {
      schemas,
      securitySchemes: {
        PublicKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Chorala-Key',
          description: 'Project public key (pk_…)',
        },
        EndUserToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Chorala-User',
          description: 'Host-signed end-user JWT (SSO)',
        },
        ApiKey: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'hk_…',
          description: 'Admin API key',
        },
        Session: {
          type: 'apiKey',
          in: 'cookie',
          name: 'better-auth.session_token',
          description: 'Dashboard session cookie',
        },
      },
    },
  }
  return cached
}
