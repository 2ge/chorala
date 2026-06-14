# DECISIONS.md

Audit trail of judgement calls made while building Heed where SPEC.md left a
choice. Format: `- [phase] chose X over Y because Z`.

## Setup / host adaptation
- [setup] Build in-place at repo root (no nested `heed/` dir) over a `heed/`
  subfolder, because this dev host already routes `idea.2pu.net` to this project
  directory; the `@heed/*` scope and `HEED_` env prefix still carry the brand token.
- [setup] Relaxed `engines.node` to `>=22` over SPEC §4's locked Node 24, because
  the dev host runs Node v22.22.2 (a current LTS that runs the whole stack) and has
  no version manager installed. Revisit before any production cut.
- [setup] Local dev points `DATABASE_URL` at the shared Postgres 16 cluster (DB
  `heed`) and `REDIS_URL` at the shared Redis (db index 9, BullMQ key prefix `heed`)
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
  (admin@heed.dev / heedadmin123) is exported from the seed for Phase 2 to consume.
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
- [phase2] Route handlers validate with the zod schemas from `@heed/types` (`schema.parse`);
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
- [phase3] Anonymous identity uses Hono's **signed cookie** (`heed_uid`, signed with
  HEED_AUTH_SECRET, SameSite=None+Secure for cross-site widgets). Reads resolve identity
  without creating; writes (`requireEndUser`) create an anon end-user + set the cookie.
- [phase3] Public API auth/CORS/rate-limit live in one `publicProject` middleware: resolves
  project by `X-Heed-Key`, enforces per-project `allowed_origins` CORS (echo origin or 403;
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
- [phase4] The widget (`@heed/widget`) is fully **standalone** — depends only on `preact`,
  defines its own response types, and imports no `@heed/*` packages. This keeps the MIT
  embed surface from importing the AGPL `@heed/types` (resolving the §3/§5 vs CLAUDE.md
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
