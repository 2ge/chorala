# Chorala API Reference

The complete HTTP API behind Chorala. Everything the dashboard, widget, MCP server and
your own integrations use goes through this one versioned API.

- **Base URL:** `https://<your-chorala-host>/api/v1` (e.g. `https://chorala.com/api/v1`)
- **Format:** JSON in, JSON out (`Content-Type: application/json`).
- **Contract:** every request/response shape is a zod schema in `packages/types` — this doc
  mirrors it; the schema is the source of truth.
- **Self-discovery:** the API advertises itself the standard ways, so clients/agents find it
  automatically — every response carries a `Link` header (RFC 8631 `service-desc` →
  `/api/v1/openapi.json`, `service-doc` → `/docs`); the spec also resolves at
  `/.well-known/openapi.json`; `/.well-known/api-catalog` (RFC 9727) and `/llms.txt` catalog it;
  the OpenAPI doc carries `externalDocs`; and `/docs` + the homepage expose `<link rel>` hints.

---

## 1. Authentication

There are three auth contexts. Each request uses exactly one.

| Context | Used by | Credential | Scope |
|---|---|---|---|
| **Public / widget** | the embed widget, your site | `X-Chorala-Key: pk_…` (project **public** key) | one project, public surface |
| **API key** | server-to-server, scripts, MCP | `Authorization: Bearer hk_…` | one project, admin surface, by scopes |
| **Session** | the dashboard | Better Auth cookie | the signed-in user's org |

### Public key (`pk_…`)
Found in **Project → Settings**. Safe to expose in client code. Sent as `X-Chorala-Key` on
every `/public/*` call. CORS is enforced per project (see §2.4).

### End-user identity (who is voting)
On public write calls the caller is resolved to an end-user, in order:
1. **`X-Chorala-User: <jwt>`** — a host-signed SSO token (HS256, signed with the project's
   *end-user JWT secret*; claims `{ id, email, name, segment }`). See §6.
2. **Signed cookie** `chorala_uid` (first-party, `SameSite=None; Secure; HttpOnly`, 1 year).
3. If neither and the endpoint writes, an **anonymous** end-user is created and the cookie set.

### API key (`hk_…`)
Created via **Project → API keys** (`POST …/keys`) — the raw key is shown **once**. Send as
`Authorization: Bearer hk_…`. Scoped to its project; `scopes` default `["read"]`.

### Session
Better Auth cookie (see §5). The dashboard calls the admin API same-origin. Optional
`X-Chorala-Org` header selects which org when the user belongs to several.

---

## 2. Conventions

### 2.1 IDs
Prefixed nanoids — `post_…`, `pk_…`, `hk_…`, `board_…`, `status_…`, `comment_…`,
`project_…`, `organization_…`, `member_…`, `user_…`, `endUser_…`, `tag_…`,
`changelog_…`, `webhook_…`, `att_…` (attachment), `co_…` (company), `sf_…` (score field),
`seg_…` (segment).

### 2.2 Errors
Always `HTTP <status>` + body:
```json
{ "error": { "code": "not_found", "message": "Post not found" } }
```

| code | status | meaning |
|---|---|---|
| `bad_request` | 400 | malformed input / failed validation |
| `unauthorized` | 401 | missing/invalid key, token or session |
| `forbidden` | 403 | authenticated but not allowed |
| `cors_forbidden` | 403 | origin not in the project's allowlist |
| `not_found` | 404 | resource doesn't exist (or not in your scope) |
| `conflict` | 409 | duplicate (e.g. slug already taken) |
| `rate_limited` | 429 | public rate limit exceeded |

### 2.3 Rate limiting (public API)
Per project + client IP, **60 requests / 60s** by default (`CHORALA_RATE_LIMIT_PUBLIC`).
Responses carry `X-RateLimit-Limit` and `X-RateLimit-Remaining`; over-limit → `429`. Fails
open if Redis is unavailable.

### 2.4 CORS
Public endpoints answer cross-origin only for origins in the project's `allowedOrigins`
(`*` allowed). Preflight (`OPTIONS`) is answered without the key; the real request enforces
the allowlist (disallowed → `403`, no `Access-Control-Allow-Origin`).

### 2.5 Pagination
List endpoints accept `?limit=` and `?cursor=` (where applicable) via the shared
`paginationQuery`.

---

## 3. Public / Widget API — `/api/v1/public`

Auth: `X-Chorala-Key`. Reads work anonymously; writes resolve/create an end-user.

### Boards & feed
```
GET /public/boards
```
Query: `boardSlug`, `statusId`, `tagId`, `sort` (`top`|`new`|`trending`|`oldest`, default
`top`), `locale`, `search`. → `{ boards: Board[], posts: LocalizedPost[] }`.
**Closed/declined posts are excluded** (the board shows active + shipped ideas); each post
includes its **`status`** (`{ name, color, kind }`, or `null`) so embedders can badge it.

```
GET /public/posts/:id?locale=
```
→ `{ post: LocalizedPost, comments: Comment[], translations: PostTranslation[] }`.

### Submit & vote
```
POST /public/posts
```
Body:
```json
{
  "boardSlug": "feature-requests",
  "title": "Dark mode",
  "body": "…",
  "locale": "en",
  "appVersion": "2.4.1",
  "metadata": { "browser": "Chrome 147", "plan": "pro" },
  "attachmentIds": ["att_…"]
}
```
`title` 2–300 chars, `body` ≤ 20 000. → `201` `LocalizedPost`.

**Submission context (Sentry/Canny-style).** Both are optional and modeled on Sentry's
indexed-vs-free-form split:
- **`appVersion`** — a first-class, **filterable** string promoted to its own column. It's
  surfaced publicly on the post (`LocalizedPost.appVersion`) and admins can filter the post
  list by it (`?appVersion=`).
- **`metadata`** — a free-form map (userAgent, locale, platform, screen, plan, …). Stored
  **admin-only**; never returned on the public payload. The widget auto-fills it (see §8).
- **`attachmentIds`** — ids returned by `POST /public/attachments` (below), linked to the
  post on create. Scoped to the same end-user, so only your own uploads attach.

```
POST /public/attachments
```
Upload a bug-report screenshot (or image) as a data URL, then thread the returned id into
`attachmentIds`:
```json
{ "dataUrl": "data:image/png;base64,iVBORw0KGgo…", "kind": "screenshot" }
```
Accepts `image/png|jpeg|webp|gif`. Enforced limits: **5 MB/file**
(`CHORALA_ATTACHMENT_MAX_BYTES`) and a **1 GB/project** quota
(`CHORALA_ATTACHMENT_QUOTA_BYTES`); over either → `400`. → `201`
`{ id, kind, mimeType, byteSize, width, height }`. Bytes are **admin-only** — never served on
a public URL.

```
POST   /public/posts/:id/vote     // cast a vote
DELETE /public/posts/:id/vote     // remove it
```
→ `{ "voted": true, "voteCount": 143 }`.

```
POST /public/posts/:id/comments
```
Body: `{ "body": "…", "parentCommentId"?: "comment_…" }` → `201` `Comment`.

### Roadmap & changelog
```
GET  /public/roadmap?locale=
```
→ `{ columns: [{ status: Status, posts: LocalizedPost[] }] }`.

```
GET  /public/changelog
POST /public/changelog/subscribe     body: { "email": "a@b.com" }   → 201
```

### Identify (SSO)
```
POST /public/identify     body: { "jwt": "eyJ…" }
```
Verifies the host-signed JWT and upserts the end-user. → `{ endUser, token }`. (Usually you
just pass the JWT as `X-Chorala-User` per request instead — see §6.)

---

## 4. Admin / Management API — `/api/v1`

Auth: session **or** `Authorization: Bearer hk_…`. All resources are org/project-scoped to
the caller automatically.

### Projects — `/projects`
```
GET    /projects                 list
POST   /projects                 { name, slug, isPublic?, allowedOrigins? }      → 201
GET    /projects/:id
PATCH  /projects/:id             partial + { customDomain?, widgetSettings? }
DELETE /projects/:id
```
`slug` matches `^[a-z0-9-]+$`. Create returns the project incl. its `publicKey` and
`endUserJwtSecret`.

### Boards — `/projects/:projectId/boards`
```
GET /  · POST / { name, slug, description?, kind?(feature|bug|general), isPrivate? }
GET /:id · PATCH /:id · DELETE /:id
```

### Statuses — `/projects/:projectId/statuses`
```
GET /  · POST / { name, color, kind(open|planned|in_progress|complete|closed), showOnRoadmap?, position? }
PATCH /:id · DELETE /:id
```

### Posts — `/projects/:projectId/posts`
```
GET    /                  list (filters: board, status, tag, appVersion, companyId, plan, minMrr, assignee; sort incl. revenue, score)
GET    /?format=csv       same filters → text/csv export (one column per score field)
POST   /                  { boardId, title, body?, statusId?, locale? }            → 201
GET    /:id
GET    /:id/context        → { appVersion, context }   // submission metadata map (admin-only)
GET    /:id/attachments    → Attachment[]              // screenshots (metadata; bytes via dashboard)
GET    /:id/customer       → { endUser, company }      // who filed it + their account/MRR
POST   /:id/vote-for       { email?, externalId?, name? }   // vote on behalf of a customer
PATCH  /:id               { title?, body?, statusId?, boardId?, isPinned?, eta?, assigneeMemberId?, fields? }
DELETE /:id
POST   /:id/status        { statusId: "status_…" | null }     // moves on the roadmap, fires integrations
POST   /:id/pin           toggle pin
POST   /:id/merge         { targetPostId: "post_…" }          // votes/comments fold into target
POST   /:id/tags          { tagIds: ["tag_…"] }
```
`?appVersion=` filters the list to one app version (pairs with the public `appVersion` field).
`GET /:id/context` returns the free-form `metadata` submitted with the post; `GET
/:id/attachments` returns screenshot metadata — the raw bytes are streamed only through the
authenticated dashboard, never a public URL.

### Comments — `/projects/:projectId/posts/:postId/comments`
```
GET /  · POST / { body, parentCommentId?, isInternal? }  · DELETE /:id
```

### Tags — `/projects/:projectId/tags`
```
GET /  · POST / { name, color }  · DELETE /:id
```

### Score fields — `/projects/:projectId/score-fields`  (weighted prioritization)
```
GET    /                 list fields (key, label, weight)
POST   /                 { key, label, weight }      → 201
PATCH  /:id              partial
DELETE /:id
```
A post's **score** = Σ (`post.fields[key]` × `weight`) over the project's fields. Set values via
`PATCH /posts/:id { fields: { reach: 10, effort: 3 } }`; give cost-like inputs a **negative
weight** (e.g. `effort: -1`) to model RICE/ICE. Admin post rows carry the computed `score`;
`?sort=score` ranks by it.

### Companies — `/projects/:projectId/companies`  (B2B revenue intelligence)
```
GET   /                  list + rollups (userCount, postCount), richest (MRR) first
GET   /:id
PATCH /:id               { name?, domain?, mrr?, plan? }   // edit revenue when not synced via JWT
```
Companies are created/updated from the identify JWT's `company` claim (§6). They drive:
- **`GET …/posts?sort=revenue`** — orders by `revenueImpact` = Σ MRR of the *distinct*
  companies whose users voted (each account counted once). Every admin post row carries
  `revenueImpact` next to `voteCount`.
- **Author-segment filters** on the posts list: `?companyId=`, `?plan=`, `?minMrr=` (posts
  authored by users of that company / plan / MRR floor).
- **`GET …/posts/:id/customer`** → `{ endUser, company }` — who filed it and their account.

### Segments — `/projects/:projectId/segments`  (audience targeting)
```
GET    /                 list segments + how many end-users match each
POST   /preview          { match, rules } → { matchCount }   // live count for an unsaved def
POST   /                 { name, definition }                → 201
GET    /:id  · PATCH /:id · DELETE /:id
```
A **definition** is `{ match: "all"|"any", rules: [{ field, op, value }] }`.
Fields: `plan`, `mrr`, `locale`, `email_domain`, `has_company` (over the end-user + their
company). Ops: `eq, neq, gt, gte, lt, lte`. A segment resolves to the matching end-users — used
to target changelog announcements.

### Changelog — `/projects/:projectId/changelog`
```
GET /  · POST / { title, body, status(draft|published), labels[], linkedPostIds[], segmentId? }
GET /:id · PATCH /:id · DELETE /:id
```
Publishing fires `changelog.published` and emails recipients. **`segmentId`** targets only that
segment's end-users (else all subscribers); the entry records `recipientCount`. Title/body support
**`{{first_name}}` / `{{name}}` / `{{email}}` / `{{company}}` / `{{plan}}`** variables, rendered
per recipient.

### API keys — `/projects/:projectId/keys`
```
GET /  · POST / { name, scopes?(["read"]) }  → { id, name, key, prefix }   // raw key shown ONCE
DELETE /:id
```

### Analytics — `/projects/:projectId/analytics`
```
GET /?timeframe=30d&boardId=
```
→ `{ topPosts[], voteVelocity[], clusterThemes[] }`. `timeframe`: `7d|30d|90d|all`.

### AI / Autopilot — `/projects/:projectId`
```
GET  /posts/search?q=…             semantic search (pgvector); falls back to text if AI off
POST /posts/:id/summarize          → AI summary of the thread
POST /changelog/draft              { postIds: [...] } → drafted changelog entry
POST /ingest                       { source, text, author?, url? }  → AI extracts feature
                                     requests as PENDING posts (Autopilot) → 201 { created[] }
POST /ask                          { question } → { answer, sources[], aiEnabled }
```
**Ingest** turns a raw support conversation into feedback. `source` ∈
`intercom|zendesk|slack|email|manual`; real connectors are thin webhooks that POST here.
Extracted posts land in `review_status="pending"` — **hidden from the public board** and the
default admin list until a human approves them:
```
GET  /posts?review=pending         the review queue  (review ∈ none|pending|dismissed|all)
POST /posts/:id/approve            → live
POST /posts/:id/dismiss            → never published
```
All AI features **degrade gracefully** when `CHORALA_AI_PROVIDER=none` — ingest captures the
conversation as one request, and ask returns a keyword match without a synthesized answer.

### Organization — `/org`
```
GET   /                            current org
PATCH /                            { name?, defaultLocale?, locales?, settings? }
GET   /members
POST  /members                     { email, role(owner|admin|member) }    // invite
PATCH /members/:id                 { role }
DELETE /members/:id
```

---

## 5. Auth API — `/api/v1/auth` (Better Auth)

Email + password, with verification and reset wired to email.

```
POST /auth/sign-up/email           { name, email, password }     // auto-creates a personal org
POST /auth/sign-in/email           { email, password }
POST /auth/sign-out
GET  /auth/get-session
POST /auth/request-password-reset  { email }                     // emails a reset link
POST /auth/reset-password          { newPassword, token }
GET  /auth/verify-email?token=…&callbackURL=…
```
CSRF-protected via trusted origins; sessions are cookie-based. Social login (`/auth/sign-in/social`)
activates when `GITHUB_*` / `GOOGLE_*` env vars are set.

---

## 6. End-user SSO (attributing votes to your logged-in users)

Sign a short-lived **HS256** JWT on **your server** with the project's *end-user JWT secret*
(Project → Settings) and hand it to the widget — or send it as `X-Chorala-User` on direct
public calls.

```ts
import { SignJWT } from 'jose'
const token = await new SignJWT({ id: user.id, email: user.email, name: user.name,
                                  segment: { plan: 'pro' },
                                  company: { id: 'acct_42', name: 'Globex', mrr: 4200, plan: 'pro' } })
  .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1h')
  .sign(new TextEncoder().encode(END_USER_JWT_SECRET))
```
The optional **`company`** claim (`{ id, name?, domain?, mrr?, plan? }`) upserts a B2B account
(keyed by `id`) and links the user to it — powering **revenue-weighted prioritization** (§4).
`segment` is free-form attributes. Anonymous visitors fall back to the `chorala_uid` cookie.

---

## 7. Webhooks

Configure per project. Each delivery is `POST`ed as:
```json
{ "event": "post.status_changed", "payload": { … }, "timestamp": 1718400000000 }
```
Headers: `X-Chorala-Event` and `X-Chorala-Signature` — an HMAC-SHA256 of the raw body keyed
by the webhook secret. Verify it before trusting the payload. Retried with backoff on
non-2xx.

**Events:** `post.created`, `post.status_changed`, `post.merged`, `comment.created`,
`changelog.published`, `vote.created`.

### Inbound webhook (Segment-compatible) — `POST /inbound/:projectId`
Push customer data in to auto-populate end-users + companies (powers revenue weighting +
segments). Enable it in **Settings → Inbound webhook** to get a secret; send it as a Bearer token.
```
POST /api/v1/inbound/{projectId}      Authorization: Bearer <inbound secret>
{ "type": "identify", "userId": "u_1", "traits": { "email": "a@b.com", "name": "Ann" } }
{ "type": "group", "userId": "u_1", "groupId": "acme", "traits": { "name": "Acme", "plan": "pro", "mrr": 4200 } }
```
`identify` upserts the end-user (traits → segment); `group` upserts the company and links the
user. Point Segment (or any source) here. **Discord**: connect an incoming-webhook URL in Settings
to post new feedback + shipped changelog entries to a channel.

---

## 8. Embed (JS) — `widget.js`

The browser widget is the public API's most common consumer. Minimal embed — one tag,
self-configuring:
```html
<script async src="https://chorala.com/widget.js" data-chorala-key="pk_live_xxx"></script>
```
Attributes: `data-chorala-key` (required), `data-mode` (`floating|inline|manual`),
`data-locale`, `data-view` (`board|roadmap|changelog`), `data-color`, `data-jwt` (SSO),
`data-app-version` (stamped onto every submission as the filterable `appVersion`).

Programmatic control (`window.Chorala`): `init`, `identify({ jwt })`, `open(view?)`, `close`,
`render(selector, { view })`, `on(event, cb)`. JS-computed config can also be set via
`window.choralaSettings = { projectKey, appVersion, user: { jwt } }` before the script.

**Auto-collected context.** Every submission carries a `metadata` map the widget fills with
no host config — `browser`, `os`, `url`, `locale`, `screen`, `viewport`, `timezone`,
`referrer` (Sentry-style contexts; admin-only, see §3). On **bug boards** (`kind=bug`) the
submit form also offers **screenshot capture** (Screen Capture API / file / paste) with
redact + highlight annotation, uploaded via `POST /public/attachments`.

On engagement the widget fires a `chorala:engaged` `CustomEvent` on the host window
(`detail.type` ∈ `vote|comment|feedback|submit|engaged`) and, in iframes, `postMessage`s
`{ source: 'chorala', type }` — use it for reward/analytics hooks.

See [`README.md`](../README.md#widget-embed-guide) for the full embed guide.

---

## 9. MCP server

Triage feedback from Claude / Cursor. The MCP server is a thin client of this admin API,
authenticated with an `hk_…` key — 9 tools incl. `search_feedback`, `top_requests`,
`summarize_post`, `draft_changelog_from_posts`. See [`packages/mcp/README.md`](../packages/mcp/README.md).

---

## Appendix — enums

| enum | values |
|---|---|
| `postSort` | `top`, `new`, `trending`, `oldest` |
| `statusKind` | `open`, `planned`, `in_progress`, `complete`, `closed` |
| `boardKind` | `feature`, `bug`, `general` |
| `changelogStatus` | `draft`, `published` |
| `memberRole` | `owner`, `admin`, `member` |
| `integrationType` | `slack`, `linear`, `github` |
| `webhookEvent` | `post.created`, `post.status_changed`, `post.merged`, `comment.created`, `changelog.published`, `vote.created` |
