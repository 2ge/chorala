# DECISIONS.md

Audit trail of judgement calls made while building Chorala where SPEC.md left a
choice. Format: `- [phase] chose X over Y because Z`.

## Rebrand → Chorala (2026-06-14)
- [brand] Named the product **Chorala** (chorala.com) — registered, CF zone active. The original
  build-time codename was a common dictionary word whose `.com` was already owned by a third
  party (a search for the brand would leak elsewhere); "Chorala" (a coined word, from *chorus* —
  many voices) is an exact-match domain the project fully owns.
- [brand] **Full purge:** every trace of the old codename was renamed to Chorala in one
  case-exact pass across the whole repo — package scope `@chorala/*`, env prefix `CHORALA_*`,
  wire-protocol tokens (`window.Chorala`, `chorala:engaged`, `postMessage source:'chorala'`,
  `X-Chorala-Key`/`X-Chorala-Signature`), widget CSS vars/classes (`--chorala-*`, `chorala-*`),
  cookies (`chorala-theme`, `chorala_uid`), Postgres DB/role, Redis/BullMQ prefix, and PM2
  process names. The codename appears nowhere in the source (guarded by a test, see §13).
- [brand] The embed wire-protocol rename is a **coordinated cutover** with the one live embed
  (MusicAha): no back-compat aliases are kept. The host page must update `window.Chorala`,
  the `chorala:engaged` listener and `source:'chorala'` check — see the migration note handed
  to the MusicAha side.
- [brand] Canonical URL is `https://chorala.com` (`CHORALA_PUBLIC_URL` value); `idea.2pu.net`
  + `www.chorala.com` kept as trusted origins/admin hosts so all routes still log in.
- [brand] Migrated the live seeded admin in place and re-hashed its password (no user delete)
  to avoid cascading the live posts/members it authored; later deleted in favour of the real
  owner (`satoshinakashu@pm.me`) + an isolated public demo account (`demo@chorala.com`).
- [brand] Customer feedback portals (`/site/*`) now set their own indexable, project-named
  metadata instead of inheriting the admin dashboard's `Chorala — Admin` + noindex.

## Infra: chorala.com routing (2026-06-14)
- [infra] `chorala.com` rides the existing path: Cloudflare (2ge account, Flexible SSL) →
  lb2 (`172.20.10.12`) `20-frontend.cfg` `aidev` backend (`172.20.111.111:80`) → this box's
  haproxy `is_chorala` → `idea_api`(`:8787`)/`idea_app`(`:3015`). Mirrors `musicaha.com`
  exactly; no lb1/lb2 net-new components. (aidev SSH egress to lb1:2223 was opened for this.)

## Embed: one-tag self-configuring widget (2026-06-14)
- [widget] Adopted the modern Plausible/Umami-style embed: a single
  `<script async src=".../widget.js" data-chorala-key="pk_…">` self-inits the widget — no
  IIFE, no queue stub, no `init()` call. SSO fits the same tag via `data-jwt`; JS-computed
  config uses a `window.choralaSettings` object. The self-init runs only if no `Chorala('init')`
  was queued programmatically, so existing/queue embeds still work. `document.currentScript`
  is null for async scripts, so it falls back to `querySelector('script[data-chorala-key]')`.
- [widget] **Removed `packages/widget-loader`** (deviates from SPEC §3/§5, which is now stale).
  It was unused — nothing imported it, the API never served a `loader.js`, and the queue
  support it duplicated already lives in `widget.js`. The one-tag form makes a standalone
  loader obsolete. Dropping it keeps zero backward-compat cost.

## Setup / host adaptation
- [setup] Build in-place at repo root (no nested `chorala/` dir) over a `chorala/`
  subfolder, because this dev host already routes `idea.2pu.net` to this project
  directory; the `@chorala/*` scope and `CHORALA_` env prefix still carry the brand token.
- [setup] Relaxed `engines.node` to `>=22` over SPEC §4's locked Node 24, because
  the dev host runs Node v22.22.2 (a current LTS that runs the whole stack) and has
  no version manager installed. Revisit before any production cut.
- [setup] Local dev points `DATABASE_URL` at the shared Postgres 16 cluster (DB
  `chorala`) and `REDIS_URL` at the shared Redis (db index 9, BullMQ key prefix `chorala`)
  over spinning project-local containers, per this host's PORTS.md conventions. The
  Docker Compose self-host path (Phase 8) still ships dedicated postgres+redis so the
  one-command self-host promise (SPEC §14) holds for external users.
- [setup] AI verified via the Vitest mock provider + `NoopProvider` degradation path
  (both already required by SPEC §11/§13) over a live model, because the host has no
  local Ollama (`:11434` is closed). The pluggable provider layer is built in full; a
  live provider is a config change away.
- [setup] API (`:8787`) will be exposed via haproxy path-routing on `idea.2pu.net`
  (`/api/*` and `/widget.js` → `:8787`, everything else → dashboard `:3015`) over a
  second hostname, mirroring the `tapmenu.ai` split. Wired when the API first runs
  (Phase 2), not in Phase 0.

## Phase 0
- [phase0] Per-package `build` scripts are no-op stubs until each package's
  implementing phase, so `pnpm build` stays green and the repo is runnable at every
  commit boundary (CLAUDE.md §3). Each is replaced with a real build in its phase.
- [phase0] Pinned tooling at the latest stable majors from SPEC §4: biome 2,
  turbo 2, typescript 5. `docker-compose.yml` ships only postgres(+pgvector) and redis
  in Phase 0; the api/dashboard/worker/caddy services are added in Phase 8.

## Phase 1
- [phase1] Internal packages export TypeScript **source** directly (`main`/`exports` →
  `./src/index.ts`) and `build` = `tsc --noEmit` (typecheck only), over compiling each to
  `dist`. Reason: the whole stack is bundler-driven (tsx, esbuild, Next, tsup, vitest), so
  source consumption removes a build-ordering tax and keeps dev iteration instant. tsconfig
  base therefore uses `module: Preserve` + `moduleResolution: Bundler`.
- [phase1] Did **not** use `drizzle-zod`; the `packages/types` zod contract is hand-written
  so the package depends only on `zod` and stays safe for the MIT widget/mcp/sdk packages to
  consume (CLAUDE.md §code-conventions / SPEC §3).
- [phase1] Vitest pinned to **3.2.6** (SPEC §4 locks major 3) even though 4.x is out.
- [phase1] Enum-like columns modeled as Drizzle `text().$type<...>()` rather than Postgres
  `pgEnum`, to avoid enum-alter migration friction; zod schemas enforce the allowed values.
- [phase1] Better Auth core tables (`users/sessions/accounts/verifications`) are defined in
  the Drizzle schema now (plural names) so migrations create them in Phase 1; Better Auth is
  configured to map its models to these tables in Phase 2.
- [phase1] Seed creates the admin `user` + `member` (owner) rows but defers the password
  **credential** to Phase 2, where Better Auth's hasher is available. `SEED_ADMIN`
  (admin@chorala.com / choralaadmin123) is exported from the seed for Phase 2 to consume.
- [phase1] Prepended `CREATE EXTENSION IF NOT EXISTS vector;` to migration `0000` (drizzle-kit
  does not emit it) so a fresh DB / CI provisions pgvector self-sufficiently.
- [phase1] `db:push` needs a TTY to confirm, so the canonical apply path is
  `db:generate` (committed SQL migrations, a BUILD_PLAN deliverable) + `db:migrate`
  (non-interactive). `db:push` remains for quick local iteration.

## Phase 2
- [phase2] Core services are organized one-file-per-resource and exported as **namespaces**
  (`core.projects.*`, `core.posts.*`) so route handlers read declaratively and stay thin.
- [phase2] `getProject` is the single scope gate reused by every nested service; it enforces
  org ownership AND, for api-key callers, restricts access to the single scoped project
  (api keys are project-scoped per SPEC §8.1). Caught + fixed a cross-project read during
  manual testing.
- [phase2] Better Auth `seed:admin` script recreates the seeded admin via Better Auth's
  sign-up API and re-attaches the preserved org membership, rather than reverse-engineering
  its password-hash format — robust across Better Auth versions.
- [phase2] Post reads use an explicit column selection that **omits the `embedding` vector**
  so 768-float arrays never leak into API responses or waste bandwidth.
- [phase2] Route handlers validate with the zod schemas from `@chorala/types` (`schema.parse`);
  a single Hono `onError` maps `AppError`/`ZodError` to the `{ error: { code, message } }`
  contract. No `@hono/zod-validator` dependency needed.
- [phase2] Parent-mounted route params (`projectId`, `postId`) type as `string | undefined`
  under `noUncheckedIndexedAccess`; a `reqParam()` helper narrows + 400s if absent.
- [phase2] `noNonNullAssertion` disabled for test/seed files via a Biome override (idiomatic
  there); enforced everywhere else.
- [phase2] haproxy: added `idea_api` backend + `is_idea_api` ACL so `idea.2pu.net/api/*` and
  `/widget.js` route to `:8787`, everything else to the dashboard `:3015`. API runs via
  `tsx` for now (PM2/Docker packaging is Phase 8). `/health` is direct-only (not under /api).

## Phase 3
- [phase3] End-user JWT verified with **jose** (`jwtVerify`, HS256) — constant-time HMAC
  per SPEC §13 — rather than hand-rolling JWT crypto. jose isn't in SPEC §4's table but is
  the standard, audited choice; logged here.
- [phase3] Anonymous identity uses Hono's **signed cookie** (`chorala_uid`, signed with
  CHORALA_AUTH_SECRET, SameSite=None+Secure for cross-site widgets). Reads resolve identity
  without creating; writes (`requireEndUser`) create an anon end-user + set the cookie.
- [phase3] Public API auth/CORS/rate-limit live in one `publicProject` middleware: resolves
  project by `X-Chorala-Key`, enforces per-project `allowed_origins` CORS (echo origin or 403;
  `*` allowed), then a Redis fixed-window rate limit keyed by project+IP+minute. Rate limit
  **fails open** if Redis is down (graceful degradation, SPEC §2).
- [phase3] `POST /vote` and `DELETE /vote` map to an explicit `votes.setVote(..., shouldVote)`
  (idempotent add/remove) rather than a blind toggle, matching SPEC §8.2's two verbs. Votes
  always land on the canonical (post-merge) post → cross-language/duplicate ideas accumulate.
- [phase3] Localization is an overlay: the public feed fetches `post_translations` for the
  requested locale and swaps title/body, exposing `displayLocale`; original otherwise. This
  is what lets a French and Spanish user vote on the **same** canonical idea (SPEC §1/§11).
- [phase3] New public posts get the project's first `open`-kind status; embed/dedup/translate
  job enqueue is a marked TODO until the worker exists (Phase 6).
- [phase3] Public API integration tests run in-process via `app.request` against the seeded
  `acme` project (signs real JWTs with jose); they add a little data to that project per run
  (acceptable — seed is re-runnable).

## Phase 4
- [phase4] The widget (`@chorala/widget`) is fully **standalone** — depends only on `preact`,
  defines its own response types, and imports no `@chorala/*` packages. This keeps the MIT
  embed surface from importing the AGPL `@chorala/types` (resolving the §3/§5 vs CLAUDE.md
  tension in favor of "MIT must not import AGPL") and keeps the bundle tiny/self-contained.
- [phase4] Bundled with **tsup** (esbuild) → a single IIFE `widget.js` with Preact inlined.
  Result: 30KB raw / **11.6KB gzip** (target <40KB). Loader is **365B** (target <2KB).
- [phase4] Rendered into a **Shadow DOM** root with all CSS scoped inside (`:host { all: initial }`
  + class-prefixed rules). Verified in a real browser (Playwright): hostile host CSS
  (`* { color: crimson !important; font-family: Comic Sans !important }`, lime buttons) does
  not penetrate, and widget styles do not leak out.
- [phase4] The widget derives the public API base from its own `<script src=".../widget.js">`
  origin (override via `init({ apiUrl })`), so a host only pastes the snippet + project key.
- [phase4] API serves the built bundle at `/widget.js` (ACAO `*`, cached) by reading
  `packages/widget/dist/widget.js`; falls back to an error stub if not built. It also serves
  the demo at `/widget-demo.html` (dev convenience; the page also ships in the dashboard).
- [phase4] Two Biome a11y rules (`noStaticElementInteractions`, `useKeyWithClickEvents`) are
  disabled only for `mount.tsx`'s modal backdrop (standard dismiss-on-backdrop pattern); a
  real Escape-to-close handler + the keyboard-focusable × button preserve accessibility.
  `widget-demo.html` is excluded from Biome (it intentionally uses `!important` host CSS).

## Phase 5
- [phase5] Dashboard pinned to **Next 15.5.19** + **React 19** (SPEC §4 locks Next major 15;
  16 is out). Tailwind 4 via `@tailwindcss/postcss`.
- [phase5] Used hand-built shadcn-style Tailwind components (`components/ui.tsx`, CVA variants)
  instead of running the shadcn CLI / Radix — keeps the dependency surface small and the build
  fast while matching the shadcn look. Logged as a deviation from SPEC §4's "shadcn/ui".
- [phase5] The dashboard is **server-component-first**: pages call `@chorala/core` services
  directly (it's an AGPL server app) and mutations are **server actions** (`lib/actions.ts`)
  that resolve the session→AuthContext and call core, then `revalidatePath`. No HTTP round-trip
  to the API for admin data.
- [phase5] Auth: the dashboard runs its own Better Auth instance with the **same secret + DB +
  cookie scheme** as the API. On the shared host `idea.2pu.net`, sign-in POSTs to the API's
  Better Auth (haproxy routes `/api/*` → :8787), which sets the session cookie; the dashboard
  (:3015) reads it. Both key `useSecureCookies` off `CHORALA_PUBLIC_URL`'s scheme so the cookie
  name/flags match across backends — without this the dashboard looked for a differently-prefixed
  cookie and never saw the session (caught + fixed via Playwright). Note: this means admin auth
  works on the shared host, not across distinct localhost ports.
- [phase5] Public portal lives under `/portal/[projectId]`, server-rendered from `publicFeed`,
  themed by the project's `widgetSettings.primaryColor`; portal voting calls the public API
  client-side with the project key (same-origin on idea.2pu.net).
- [phase5] E2E: a committed Playwright spec (`apps/dashboard/e2e/journey.spec.ts`) drives the
  full SPEC §13 journey against a live stack (BASE_URL, default idea.2pu.net) — **passes**.
  Also verified interactively via the Playwright MCP (real Chromium).
- [phase5] Biome: excluded `*.css` (Tailwind 4 at-rules aren't parseable by Biome's CSS parser)
  and disabled `a11y/noLabelWithoutControl` for the dashboard (reusable Label component).

## Phase 6
- [phase6] `packages/ai`: `LLMProvider` interface + Ollama/OpenAI/Anthropic/Noop providers
  (plain `fetch`, no vendor SDKs → light deps) selected by a factory from env. Tasks
  (embed, dedup, translate, processPost, clusterThemes, summarize) are pure functions over
  (provider, db) so they're unit-testable with a mock provider.
- [phase6] AnthropicProvider.canEmbed = false (Anthropic has no embeddings API); `embed()`
  throws a clear message. Embedding dim is fixed at 768 (nomic-embed default, matches the
  schema's `vector(768)`); OpenAI users must pick a 768-dim model.
- [phase6] Dedup records a **suggestion** in `ai_jobs` (kind=dedup, result.suggestions) and
  never auto-merges (SPEC §11). pgvector cosine (`<=>`) finds candidates ≥ threshold.
- [phase6] Cross-language: `translatePost` writes `post_translations` (is_auto) for every org
  locale; votes already attach to the canonical post, so a localized view votes on the same row.
- [phase6] Queues (`packages/core/src/queues.ts`): BullMQ producers (ai/webhooks/email,
  prefix `chorala`) with `safeAdd` that **fails open** if Redis is down and **no-ops under
  NODE_ENV=test** (so unit tests don't open queue connections / hang Vitest). Lazy connection.
- [phase6] `apps/worker`: BullMQ workers — AI (processPost/clusterThemes/summarize via the
  env provider), webhooks (HMAC `X-Chorala-Signature`, BullMQ retries/backoff), email. Core
  services enqueue on the right events (post.created→AI+webhook, status_changed, merged,
  comment.created, vote.created, changelog.published).
- [phase6] `packages/email`: pluggable transport (SMTP via nodemailer / Resend via fetch /
  Noop) + HTML template builders. Used plain HTML builders rather than React Email components
  to keep deps light; email is Noop on this host. Logged as a deviation from SPEC §11.
- [phase6] Verified: AI task chain + Noop degradation via Vitest mock provider (5 tests);
  live worker boots and consumes an enqueued job end-to-end (producer→Redis→worker→transport).

## Phase 7
- [phase7] `packages/mcp` (MIT) is a **standalone HTTP client** of the Chorala admin API
  (Bearer `hk_…` key) — it imports `@modelcontextprotocol/sdk` + `zod` only, never the AGPL
  server code, honoring SPEC §3's "MIT must not import AGPL". It defines its own minimal types.
- [phase7] To back the AI-powered MCP tools, added a small admin API surface
  (`apps/api/src/routes/ai.ts`, mounted before `/posts/:id` so `/posts/search` wins):
  `GET /posts/search` (semantic via pgvector, text fallback when AI off), `POST
  /posts/:id/summarize`, `POST /changelog/draft`. Core gained `posts.semanticSearch`; AI
  gained `draftChangelogFromPosts`. The api now depends on `@chorala/ai`.
- [phase7] 9 tools: list_boards, list_posts, get_post, search_feedback, top_requests,
  cluster_themes, summarize_post, update_post_status (resolves status by name), and
  draft_changelog_from_posts. The api key is project-scoped, so the server resolves its
  single project via `GET /projects` and caches the id.
- [phase7] Transports: stdio (default, for local Claude clients) + streamable HTTP
  (`CHORALA_MCP_TRANSPORT=http`). README ships the exact Claude Desktop / Claude Code config.
- [phase7] The MCP test (`test/stdio.test.ts`) spawns the server and drives it with the real
  MCP SDK client over stdio; **skips cleanly** (exit 0) without `CHORALA_MCP_API_KEY` so it
  doesn't break `pnpm test`. Verified live: 9 tools; search_feedback + top_requests return
  seeded data.

## Phase 8
- [phase8] `packages/billing` (AGPL): plans (free/starter/pro by **admin-seat** count — never
  user/vote metering, SPEC §1/§12), `assertSeatAvailable` (wired into member invites; no-op in
  self-host), and Stripe checkout + webhook handlers. Stripe is **lazy-imported** so self-host
  never loads it; the whole module is inert unless `CHORALA_DEPLOYMENT=cloud`. Verified inert.
- [phase8] Docker: real multi-stage-ish Dockerfiles for api/worker (run TS source via tsx) and
  dashboard (next build → next start); `Caddyfile` routes `/api/*` + `/widget.js` → api, else →
  dashboard; `docker-compose.yml` runs postgres(pgvector)+redis+api+worker+dashboard+caddy with
  only Caddy publishing 80/443 (pg/redis internal). API runs migrations on boot.
- [phase8] Did NOT use turbo-prune per-service pruning; each image does a full workspace
  `pnpm install` (simpler, correct; prune is a future image-size optimization). Logged.
- [phase8] Full `docker compose up` was NOT executed on this dev host because it already binds
  :80 (haproxy), :5432 and :6379 (shared PG/Redis) — bringing the stack up would collide. Instead
  verified: `docker compose config` is valid (6 services) and the worker image **builds end to
  end**; the three apps were run live throughout (api/dashboard/worker) against shared PG/Redis.
- [phase8] CI (`ci.yml`): install → lint → build → db:migrate → db:seed → test, with pg+redis
  service containers and AI/email set to none.
- [phase8] README expanded: one-command self-host, local dev, widget embed, end-user JWT/SSO,
  MCP, env reference, cloud-vs-selfhost, architecture, licensing, contributing.

## Design pass
- [design] Gave the dashboard + portal a distinctive **"editorial paper"** identity (warm
  off-white canvas + grain/gradient, near-black warm ink, a single confident **vermilion**
  accent fitting for upvotes) — deliberately away from the generic indigo/purple-on-white
  SaaS look. Display font **Fraunces** (serif, optical sizing) for the wordmark + page titles;
  **Hanken Grotesk** for UI, via `next/font`.
- [design] New token system in `globals.css` (`--color-paper/raised/ink/line/accent…`), with
  `brand-*` repointed to the accent so existing utilities recolor instantly; refined `ui.tsx`
  primitives (buttons w/ inset highlight + accent ring, fields, cards via `.surface`, badges
  with status dots), a signature tactile **VotePill**, an icon'd active-state sidebar nav,
  redesigned login (oversized decorative wordmark), polished portal + kanban roadmap.
  Widget keeps its own per-project theming. Verified visually via Playwright.

## Themes + responsive
- [design] Added a 5-theme system (Paper, Midnight/dark, Forest, Cobalt, Mono) as pure CSS
  custom-property swaps under `:root[data-theme]` — every surface re-skins instantly because
  the whole UI is var-driven. A header theme picker (swatches) persists to a cookie +
  localStorage; the root layout reads the cookie for SSR so there's no flash. Theme metadata
  lives in `lib/themes.ts` (a plain module) — importing a value from a `'use client'` file into
  a server component yields a client *reference*, not the array (caused a crash; fixed).
- [design] Responsive pass: the project sidebar is desktop-only, so mobile gets a sticky
  horizontal scrollable nav bar; post-list rows wrap their pin/status controls onto their own
  line on phones and the status select is width-capped. Verified on desktop (1366) and mobile
  (390) via Playwright across posts, post detail, and theme switching.
- [phase10] Bug-report attachments use a **local-disk store** (`CHORALA_UPLOAD_DIR`, an absolute
  path shared by API + dashboard) over object storage — simplest path consistent with the
  "`docker compose up` self-host" goal (SPEC §2/§5). Cloud can swap the driver later.
- [phase10] Screenshots upload as a **base64 data URL in JSON** (`POST /public/attachments`)
  rather than multipart — avoids a body-parser dependency and keeps the widget→API contract a
  single zod schema. Per-file (5 MB) + per-project (1 GB) byte limits guard against abuse.
- [phase10] Uploaded bytes are **admin-only** (like the submission `context`): never on the
  public post payload; served through an auth-gated dashboard route (`/admin-media/[id]`) so the
  shared on-disk store is never publicly reachable. Only `appVersion` stays first-class/public.
- [phase10] The widget surfaces the screenshot control **only on `kind=bug` boards**; the
  auto-collected `context` map (browser/os/url/locale/screen) is attached to every submission.
- [phase11] Revenue impact = Σ MRR of the **distinct companies** whose users voted (not Σ over
  voters), so a 3-seat account counts its MRR once. Computed as a correlated SQL subquery on the
  posts list, exposed as `revenueImpact` alongside (never replacing) `voteCount`.
- [phase11] Company filters on the posts list (`companyId`/`plan`/`minMrr`) match the **post
  author's** company (the segment that *asked*), while revenue impact aggregates **voters'**
  companies (the demand behind it) — two different, intentional lenses.
- [phase11] In a correlated subquery used inside a SELECT projection, the outer column must be a
  literal `"posts"."id"` / `"companies"."id"` — drizzle renders an interpolated `${table.id}`
  unqualified there (qualified only in WHERE/ORDER BY), which collides with the inner tables' own
  `id` columns ("column reference id is ambiguous"). Verified live before shipping.
