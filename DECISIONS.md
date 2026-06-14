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
