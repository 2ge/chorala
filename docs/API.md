# Chorala API Reference

The complete HTTP API behind Chorala. Everything the dashboard, widget, MCP server and
your own integrations use goes through this one versioned API.

- **Base URL:** `https://<your-chorala-host>/api/v1` (e.g. `https://chorala.com/api/v1`)
- **Format:** JSON in, JSON out (`Content-Type: application/json`).
- **Contract:** every request/response shape is a zod schema in `packages/types` — this doc
  mirrors it; the schema is the source of truth.

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
`changelog_…`, `webhook_…`.

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
{ "boardSlug": "feature-requests", "title": "Dark mode", "body": "…", "locale": "en" }
```
`title` 2–300 chars, `body` ≤ 20 000. → `201` `LocalizedPost`.

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
GET    /                  list (filters: board, status, tag, search, sort)
POST   /                  { boardId, title, body?, statusId?, locale? }            → 201
GET    /:id
PATCH  /:id               { title?, body?, statusId?, boardId?, isPinned?, eta? }
DELETE /:id
POST   /:id/status        { statusId: "status_…" | null }     // moves on the roadmap, fires integrations
POST   /:id/pin           toggle pin
POST   /:id/merge         { targetPostId: "post_…" }          // votes/comments fold into target
POST   /:id/tags          { tagIds: ["tag_…"] }
```

### Comments — `/projects/:projectId/posts/:postId/comments`
```
GET /  · POST / { body, parentCommentId?, isInternal? }  · DELETE /:id
```

### Tags — `/projects/:projectId/tags`
```
GET /  · POST / { name, color }  · DELETE /:id
```

### Changelog — `/projects/:projectId/changelog`
```
GET /  · POST / { title, body, status(draft|published), labels[], linkedPostIds[] }
GET /:id · PATCH /:id · DELETE /:id
```
Publishing notifies subscribers and fires `changelog.published`.

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

### AI — `/projects/:projectId`
```
GET  /posts/search?q=…             semantic search (pgvector); falls back to text if AI off
POST /posts/:id/summarize          → AI summary of the thread
POST /changelog/draft              { postIds: [...] } → drafted changelog entry
```
All degrade gracefully when `CHORALA_AI_PROVIDER=none`.

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
                                  segment: { plan: 'pro', mrr: 4200 } })
  .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1h')
  .sign(new TextEncoder().encode(END_USER_JWT_SECRET))
```
`segment` powers prioritization (e.g. weight votes by MRR). Anonymous visitors fall back to
the `chorala_uid` cookie.

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

---

## 8. Embed (JS) — `widget.js`

The browser widget is the public API's most common consumer. Minimal embed — one tag,
self-configuring:
```html
<script async src="https://chorala.com/widget.js" data-chorala-key="pk_live_xxx"></script>
```
Attributes: `data-chorala-key` (required), `data-mode` (`floating|inline|manual`),
`data-locale`, `data-view` (`board|roadmap|changelog`), `data-color`, `data-jwt` (SSO).

Programmatic control (`window.Chorala`): `init`, `identify({ jwt })`, `open(view?)`, `close`,
`render(selector, { view })`, `on(event, cb)`. JS-computed config can also be set via
`window.choralaSettings = { projectKey, user: { jwt } }` before the script.

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
