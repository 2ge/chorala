/** Embedding vector dimensions (Ollama nomic-embed-text → 768). */
export const VECTOR_DIM = 768

/** Prefixes for nanoid-based primary keys (centralized id generation lives in @chorala/db). */
export const ID_PREFIXES = {
  organization: 'org',
  member: 'mem',
  project: 'proj',
  endUser: 'eu',
  board: 'board',
  company: 'co',
  scoreField: 'sf',
  segment: 'seg',
  survey: 'sv',
  surveyResponse: 'svr',
  status: 'status',
  post: 'post',
  postTranslation: 'ptr',
  vote: 'vote',
  comment: 'cmt',
  tag: 'tag',
  changelogEntry: 'cl',
  changelogSubscriber: 'sub',
  notification: 'ntf',
  integration: 'intg',
  webhook: 'wh',
  apiKey: 'key',
  auditLog: 'audit',
  aiJob: 'aijob',
  cluster: 'clust',
  attachment: 'att',
  user: 'user',
} as const

export type IdEntity = keyof typeof ID_PREFIXES

/** Public, externally-shared key prefixes. */
export const PUBLIC_KEY_PREFIX = 'pk'
export const API_KEY_PREFIX = 'hk'

/** Default statuses seeded per project (SPEC §7). */
export const DEFAULT_STATUSES = [
  { name: 'Open', color: '#64748b', kind: 'open', position: 0, showOnRoadmap: false },
  { name: 'Planned', color: '#6366f1', kind: 'planned', position: 1, showOnRoadmap: true },
  {
    name: 'In Progress',
    color: '#f59e0b',
    kind: 'in_progress',
    position: 2,
    showOnRoadmap: true,
  },
  { name: 'Complete', color: '#10b981', kind: 'complete', position: 3, showOnRoadmap: true },
  { name: 'Closed', color: '#ef4444', kind: 'closed', position: 4, showOnRoadmap: false },
] as const

/** Webhook event names (SPEC §8). */
export const WEBHOOK_EVENTS = [
  'post.created',
  'post.status_changed',
  'post.merged',
  'comment.created',
  'changelog.published',
  'vote.created',
] as const

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

/** AI job kinds (SPEC §7 / §11). */
export const AI_JOB_KINDS = ['embed', 'dedup', 'cluster', 'summarize', 'translate'] as const

export const DEFAULT_LOCALE = 'en'
