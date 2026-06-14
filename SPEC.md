# Chorala — Master Specification

> **This document is the single source of truth.** Every architectural decision is made
> here. If something seems ambiguous, choose the **simplest option consistent with this
> document**, implement it, and record the choice in `DECISIONS.md`. Do not stop to ask.

> **Product name:** `Chorala` (chorala.com). The display brand is **Chorala** throughout
> the UI, docs, and embed snippet. The internal package scope `@heed/*` and env prefix
> `HEED_` are retained as stable code identifiers (not user-visible), as are the wire-protocol
> tokens `window.Heed`/`heed:engaged`/`X-Heed-Key` (kept as back-compat aliases for existing
> embeds; new code uses `window.Chorala`/`chorala:engaged`).

---

## 1. What we are building

An **open-core product-feedback platform**. End users post ideas, upvote/downvote, and
discuss them. Teams triage that feedback, run a public roadmap, and publish a changelog.

The defining trait: it is **embeddable everywhere** (a tiny JS widget that drops into any
website, plus a hosted portal), **multilingual** (ideas auto-translate so users in
different languages vote on the *same* idea), **AI-native** (dedup, clustering,
summarization, translation via a pluggable LLM provider), and exposes an **MCP server**
so product teams can triage feedback from inside Claude / Cursor.

It ships as **AGPL open source that anyone can self-host with one command**, with a
**managed cloud** offering for teams who don't want to run infrastructure. The cloud
edge is that hosted AI "just works" with no GPU/token cost to the customer, plus
deliverable email, custom domains, SSO, and EU data residency.

### Positioning (informs copy + defaults)
- Direct competitor to Canny, Featurebase, Frill, Nolt, Upvoty, Sleekplan.
- **Headline promise: "We never charge you for your users voting."** Pricing is flat
  per-admin; end-users and votes are always unlimited. Never implement tracked-user
  metering.

### Non-goals for v1 (do NOT build these — stay focused)
- No native mobile SDKs (create an empty `packages/sdk-react-native` stub with a README only).
- No full helpdesk / support inbox / AI chat agent (that is competitor bloat).
- No email marketing, no NPS/CSAT surveys (can come later; not v1).
- No Salesforce/HubSpot integrations. v1 integrations are **Slack, Linear, GitHub, generic webhooks** only.
- No Kubernetes manifests. Docker Compose is the supported self-host path.

---

## 2. Core principles

1. **Single codebase, two deployment modes**, switched by `HEED_DEPLOYMENT=selfhost|cloud`.
   Cloud-only concerns (Stripe billing, multi-org signup, usage limits) live behind this
   flag and are inert in self-host.
2. **Graceful degradation.** If AI is not configured, AI features are *disabled*, never
   broken. If email is not configured, the app still runs (logs a warning).
3. **Type-safe end to end.** TypeScript strict everywhere. Shared zod schemas are the API
   contract; never hand-write request/response types twice.
4. **The widget must embed cleanly on any host page.** Shadow DOM, no global CSS leakage,
   tiny bundle, no framework assumed on the host.
5. **Self-host must be trivial.** `cp .env.example .env && docker compose up` produces a
   working instance with sane defaults.

---

## 3. Licensing (critical — get the split exact)

- **Repository root + server-side code (`apps/*`, `packages/db|core|ai|email|billing|config`):
  AGPL-3.0.** Add `LICENSE` at root.
- **Permissive (MIT) — each gets its own `LICENSE` file:**
  `packages/widget`, `packages/widget-loader`, `packages/mcp`, `packages/sdk-react-native`.
  Rationale: companies will not paste AGPL JavaScript into their apps; the embed/SDK/MCP
  surfaces must be MIT or the "embed everywhere" promise fails legal review.
- Add a `NOTICE` file and per-package `package.json` `"license"` fields matching the above.
- Add `CLA.md` and a GitHub Action stub (`cla.yml`) referencing CLA Assistant, so the
  project retains the right to dual-license later. (Stub only; no secrets.)

---

## 4. Locked stack (do not substitute)

| Concern | Choice | Major version |
|---|---|---|
| Runtime | Node.js LTS | 24 |
| Package manager / monorepo | pnpm workspaces + Turborepo | pnpm 10, turbo 2 |
| Language | TypeScript (strict) | 5.x |
| API framework | Hono + @hono/node-server | 4.x |
| Database | PostgreSQL + pgvector | 16 |
| ORM / migrations | Drizzle ORM + drizzle-kit | latest |
| Cache / rate-limit | Redis + ioredis | 7 |
| Background jobs | BullMQ | latest |
| Admin auth | Better Auth | latest |
| Dashboard / portal | Next.js App Router + React 19 | 15 |
| Styling | Tailwind CSS | 4 |
| UI components | shadcn/ui | latest |
| Widget internals | Preact + tsup (esbuild) bundling | preact 10 |
| Validation / contract | zod | latest |
| AI provider | pluggable: Ollama (default), OpenAI, Anthropic | — |
| Embeddings | Ollama `nomic-embed-text` (default) | — |
| MCP | `@modelcontextprotocol/sdk` (stdio + streamable HTTP) | latest |
| Email | pluggable: SMTP (nodemailer) default, Resend optional; React Email templates | — |
| Billing (cloud only) | Stripe | latest |
| Lint + format | Biome | 2 |
| Unit/integration tests | Vitest | 3 |
| E2E tests | Playwright | latest |
| Container | Docker + Docker Compose | — |
| Self-host TLS (compose) | Caddy | 2 |

Pin **major** versions; use latest minor/patch. If a listed package is unavailable, pick
the closest maintained equivalent and log it in `DECISIONS.md`.

---

## 5. Monorepo layout (create exactly this)

```
heed/
  apps/
    api/                  # Hono API server (admin + public/widget APIs)
    dashboard/            # Next.js 15 — admin dashboard + public portal + roadmap + changelog
    worker/               # BullMQ workers: AI tasks, email, webhook delivery, integrations
  packages/
    db/                   # Drizzle schema, migrations, seed, client (AGPL)
    core/                 # domain services shared by api + worker (AGPL)
    ai/                   # LLMProvider abstraction, embeddings, AI tasks (AGPL)
    email/                # React Email templates + pluggable transport (AGPL)
    billing/              # Stripe; no-op unless HEED_DEPLOYMENT=cloud (AGPL)
    config/               # zod-validated env loader, shared constants (AGPL)
    types/                # shared zod schemas = the API contract (AGPL)
    widget/               # embeddable Preact widget, Shadow DOM (MIT)
    widget-loader/        # the tiny <script> snippet / loader (MIT)
    mcp/                  # MCP server (MIT)
    sdk-react-native/     # stub + README only for v1 (MIT)
    tsconfig/             # shared tsconfig bases
  docker/
    Dockerfile.api
    Dockerfile.dashboard
    Dockerfile.worker
    Caddyfile
  .github/workflows/      # ci.yml, cla.yml
  CLAUDE.md
  SPEC.md                 # this file
  BUILD_PLAN.md
  DECISIONS.md            # you create + append to this as you make judgement calls
  README.md
  LICENSE                 # AGPL-3.0
  NOTICE
  CLA.md
  .env.example
  docker-compose.yml
  turbo.json
  pnpm-workspace.yaml
  biome.json
  package.json
```

---

## 6. Environment variables (full list — generate `.env.example` from this, documented)

```
# --- Deployment ---
HEED_DEPLOYMENT=selfhost              # selfhost | cloud
HEED_PUBLIC_URL=http://localhost:3000 # base URL of dashboard/portal
HEED_API_URL=http://localhost:8787    # base URL of API
NODE_ENV=development

# --- Database ---
DATABASE_URL=postgres://heed:heed@localhost:5432/heed

# --- Redis ---
REDIS_URL=redis://localhost:6379

# --- Auth (Better Auth) ---
HEED_AUTH_SECRET=                     # 32+ byte random; required
# Optional OAuth providers (admin login)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# --- AI (optional; features degrade if absent) ---
HEED_AI_PROVIDER=ollama               # ollama | openai | anthropic | none
HEED_AI_BASE_URL=http://localhost:11434
HEED_AI_API_KEY=                      # for openai/anthropic
HEED_AI_CHAT_MODEL=llama3.1:8b
HEED_AI_EMBED_MODEL=nomic-embed-text
HEED_AI_DEDUP_THRESHOLD=0.86          # cosine similarity to suggest a merge

# --- Email (optional) ---
HEED_EMAIL_TRANSPORT=smtp             # smtp | resend | none
HEED_EMAIL_FROM=feedback@example.com
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
RESEND_API_KEY=

# --- Billing (cloud only) ---
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_PRO=

# --- Widget / public API ---
HEED_WIDGET_CDN_URL=http://localhost:8787/widget.js
HEED_RATE_LIMIT_PUBLIC=60             # requests/min per IP per project on public API
```

`packages/config` must zod-validate these at boot and fail fast with a readable message
if a required var (DATABASE_URL, HEED_AUTH_SECRET) is missing.

---

## 7. Data model

Use Drizzle. All tables have `id` (text, prefixed nanoid e.g. `post_xxx`), `created_at`,
`updated_at` (timestamptz) unless noted. Multi-tenant: everything scopes to `org_id` and
usually `project_id`. Add appropriate indexes (every FK, every slug, `votes(post_id,
end_user_id)` unique, `posts.embedding` ivfflat/hnsw index).

**Tenancy & people**
- `organizations`: slug (unique), name, plan (`free|starter|pro`), default_locale,
  locales (text[]), settings (jsonb).
- `members`: org_id, user_id (Better Auth user), role (`owner|admin|member`). Unique(org_id,user_id).
- Better Auth manages `users`, `sessions`, `accounts`, `verifications`.
- `projects`: org_id, slug (unique per org), name, is_public (bool), custom_domain
  (nullable, unique), public_key (`pk_...`), end_user_jwt_secret, allowed_origins (text[]),
  widget_settings (jsonb: theme, position, primary_color, mode).
- `end_users` (voters; NOT admins): project_id, external_id (nullable, from host SSO),
  email (nullable), name (nullable), avatar_url (nullable), is_anonymous (bool), locale,
  metadata (jsonb), segment (jsonb: plan, mrr, etc. for prioritization).
  Unique(project_id, external_id) and Unique(project_id, email) when present.

**Feedback**
- `boards`: project_id, slug, name, description, kind (`feature|bug|general`), is_private,
  position.
- `statuses`: project_id, name, color, kind (`open|planned|in_progress|complete|closed`),
  position, show_on_roadmap (bool). Seed a default set per project.
- `posts` (the ideas): board_id, project_id, author_end_user_id (nullable),
  author_member_id (nullable), title, body (markdown), original_locale, status_id,
  is_pinned, vote_count (denormalized int), comment_count (denormalized int),
  embedding (vector(768)), merged_into_post_id (nullable self-FK for dedup), eta (nullable).
- `post_translations`: post_id, locale, title, body, is_auto (bool). Unique(post_id, locale).
- `votes`: post_id, end_user_id, weight (int default 1; segment-weighted later).
  Unique(post_id, end_user_id).
- `comments`: post_id, author_end_user_id (nullable), author_member_id (nullable),
  parent_comment_id (nullable), body (markdown), is_internal (bool — staff-only note).
- `tags`: project_id, name, color. `post_tags`: post_id, tag_id.

**Communication**
- `changelog_entries`: project_id, title, body (markdown), status (`draft|published`),
  published_at, labels (text[]), linked_post_ids (text[]).
- `changelog_subscribers`: project_id, email, end_user_id (nullable).
- `notifications`: recipient (member or end_user), type, payload (jsonb), read_at.

**Integration & platform**
- `integrations`: project_id, type (`slack|linear|github`), config (jsonb), secret (encrypted).
- `webhooks`: project_id, url, events (text[]), secret, is_active.
- `api_keys`: project_id, name, hashed_key, prefix, scopes (text[]), last_used_at.
- `audit_log`: org_id, actor, action, target, metadata (jsonb).
- `ai_jobs`: project_id, kind (`embed|dedup|cluster|summarize|translate`), status,
  input_ref, result (jsonb), error.
- `feedback_clusters`: project_id, label, summary, post_ids (text[]), centroid (vector),
  computed_at.

Write a `seed.ts` that creates: one org, one admin (email/password via Better Auth),
one project with public_key, default statuses, two boards (Feature Requests, Bugs), and
~15 sample posts with votes/comments in 2–3 locales so the UI and AI features have data
to show on first run.

---

## 8. API surface (`apps/api`, Hono, mounted at `/api/v1`)

All inputs/outputs validated by zod schemas exported from `packages/types`. Two surfaces:

### 8.1 Admin/management API
Auth: Better Auth session cookie **or** `Authorization: Bearer hk_...` API key. Scoped to
the caller's org/projects. Standard REST CRUD for: projects, boards, statuses, posts
(incl. status change, pin, merge, tag), comments (incl. internal), tags, changelog,
integrations, webhooks, api_keys, members (invite/role), org settings, analytics
(top posts, vote velocity, cluster themes).

### 8.2 Public / widget API
Auth: project `public_key` (header `X-Heed-Key`) + optional end-user JWT
(`X-Heed-User`, HMAC-signed by the project's `end_user_jwt_secret`). CORS restricted to
the project's `allowed_origins`. Redis rate-limited (`HEED_RATE_LIMIT_PUBLIC`/min/IP).
Endpoints:
- `GET  /public/boards` — public boards + posts (paginated, filter by status/tag/sort).
- `GET  /public/posts/:id` — post + comments + translations.
- `POST /public/posts` — create idea (creates/links end_user; enqueues embed+dedup+translate).
- `POST /public/posts/:id/vote` / `DELETE` — toggle vote (anonymous via cookie or identified).
- `POST /public/posts/:id/comments` — add comment.
- `GET  /public/roadmap` — statuses where show_on_roadmap, grouped.
- `GET  /public/changelog` — published entries.
- `POST /public/changelog/subscribe`.
- `POST /public/identify` — exchange host JWT for end_user session.

**End-user identity model:** the host app signs a JWT
`{ id, email?, name?, avatar?, segment? }` with the project's `end_user_jwt_secret`
(HS256). Widget sends it; API verifies and upserts the `end_user`. Anonymous fallback uses
a signed cookie. This mirrors Canny/Featurebase SSO and must be documented in the README.

Webhook events: `post.created`, `post.status_changed`, `post.merged`, `comment.created`,
`changelog.published`, `vote.created`. Signed with HMAC (`X-Heed-Signature`). Delivered by
the worker with retries/backoff.

---

## 9. The widget (`packages/widget` + `packages/widget-loader`) — MIT

This is the "embed everywhere" surface. Requirements:
- **Loader**: a <2KB snippet that defines `window.Chorala` (a command queue), injects
  `widget.js`, and replays queued commands. Public API:
  ```html
  <script>
    (function(w,d,s){ /* queue + async load from HEED_WIDGET_CDN_URL */ })(window,document,'script');
    Chorala('init', { projectKey: 'pk_live_xxx', locale: 'auto', user: { jwt: 'eyJ...' } });
  </script>
  ```
- **Commands**: `init`, `identify(user)`, `open(boardSlug?)`, `close`, `render(selector, {view})`,
  `on(event, cb)`. Views: `board`, `roadmap`, `changelog`.
- **Modes**: (a) floating launcher button, (b) inline embed into a host selector,
  (c) manual trigger from a host element.
- **Rendering**: Preact inside a **Shadow DOM** root so host CSS can never leak in or out.
  All styles scoped inside the shadow root. Themeable via `widget_settings` + init options.
- **Networking**: talks only to the public API with the project key (+ user JWT if present).
- **Build**: tsup → single IIFE `widget.js` (+ source map), served by the API at
  `/widget.js`. Keep gzipped bundle small (target < 40KB). No host-framework dependency.
- **i18n**: widget UI strings localized; default locale `auto` reads `navigator.language`.

---

## 10. MCP server (`packages/mcp`) — MIT

A TypeScript MCP server (`@modelcontextprotocol/sdk`) exposing feedback to AI clients
(Claude Desktop, Claude Code, Cursor). Auth via an API key (`hk_...`) passed in env/config.
Transports: **stdio** (for local Claude clients) and **streamable HTTP** (for remote).

Tools:
- `list_boards`, `list_posts(filter)`, `get_post(id)`
- `search_feedback(query)` — semantic search via pgvector embeddings
- `top_requests({ timeframe?, segment?, board? })` — ranked by weighted votes
- `cluster_themes({ board? })` — returns AI clusters/themes
- `summarize_post(id)` / `summarize_board(slug)`
- `update_post_status(id, status)` (guarded by key scope)
- `draft_changelog_from_posts(ids)` — returns a markdown draft

Ship a `README.md` with the exact `claude_desktop_config.json` / Claude Code MCP config
snippet to register it. This is both a feature and marketing — make it clean.

---

## 11. AI layer (`packages/ai`) — AGPL

- `LLMProvider` interface: `complete({system,messages,json?})`, `embed(text[])`.
- Implementations: `OllamaProvider` (default), `OpenAIProvider`, `AnthropicProvider`,
  and `NoopProvider` (when `HEED_AI_PROVIDER=none` → AI features disabled cleanly).
- Selected at boot from env via a factory.
- **Tasks** (run as BullMQ jobs in `apps/worker`):
  - `embedPost` — on create/edit, embed title+body → `posts.embedding`.
  - `dedupPost` — vector top-k; if cosine ≥ `HEED_AI_DEDUP_THRESHOLD`, attach a
    "possible duplicate of …" suggestion (admin confirms merge; never auto-merge).
  - `translatePost` — translate into the org's `locales`; write `post_translations`
    with `is_auto=true`. **Cross-language voting**: votes attach to the canonical post,
    so a French and a Thai user vote on the same idea via their localized view.
  - `clusterThemes` — periodic; embeddings → clusters → `feedback_clusters` with an
    AI-generated label+summary.
  - `summarize` — summarize long threads / boards on demand.
- All tasks must no-op gracefully under `NoopProvider`.

---

## 12. Cloud vs self-host

- `HEED_DEPLOYMENT=selfhost` (default): no Stripe, no usage caps, no public signup
  (admin created via seed/CLI), single or unlimited orgs. Everything works.
- `HEED_DEPLOYMENT=cloud`: enables public org signup, Stripe billing
  (`packages/billing`), plan-based admin-seat limits (NOT user/vote limits — never),
  and managed-AI defaults. Billing code must be fully inert when not in cloud mode.
- Plans (cloud): `free` (1 admin, branding), `starter` (~$15/mo, flat, custom domain,
  AI included, deliverable email), `pro` (~$39/mo, more admins, white-label, SSO,
  EU residency). End-users and votes are **always unlimited** in every plan.

---

## 13. Security & quality requirements

- Validate every external input with zod. Parameterized queries only (Drizzle).
- Hash API keys (store prefix + hash). Encrypt integration secrets at rest.
- CORS strictly per-project `allowed_origins` on the public API.
- Rate-limit public endpoints in Redis. CSRF protection on dashboard mutations.
- Verify webhook + end-user JWT signatures with constant-time comparison.
- No secrets in the repo; everything via env. `.env` gitignored; `.env.example` committed.
- Markdown rendered from user content must be sanitized (no raw HTML injection / XSS).
- Tests: Vitest unit tests for `core` services and `ai` task logic (mock provider);
  one Playwright e2e covering "submit idea via widget → appears on board → vote → admin
  changes status → shows on roadmap".

---

## 14. Developer experience / runnability (definition of "done" for the human)

After Claude Code finishes, the human must be able to:
```
cp .env.example .env          # fill HEED_AUTH_SECRET (and AI/email if wanted)
docker compose up             # postgres, redis, api, dashboard, worker, caddy
# OR for local dev:
pnpm install && pnpm db:push && pnpm db:seed && pnpm dev
```
…open the dashboard, log in with the seeded admin, see seeded boards/posts, open the
public portal + roadmap + changelog, and load the widget on a demo HTML page
(`apps/dashboard/public/widget-demo.html`) that submits/votes against the local API.

Root `package.json` scripts: `dev`, `build`, `lint`, `format`, `test`, `test:e2e`,
`db:generate`, `db:push`, `db:migrate`, `db:seed`. All wired through Turborepo.
