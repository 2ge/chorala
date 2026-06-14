# CLAUDE.md — working agreement for this repo

You are building **Chorala**, an open-core feedback platform. `SPEC.md` is the source of
truth for *what* to build; `BUILD_PLAN.md` is the ordered list of *how*; this file is
*how to behave*.

## Prime directives
1. **Do not ask the human questions.** Every decision is in `SPEC.md`. If something is
   genuinely underspecified, pick the **simplest option consistent with `SPEC.md`**,
   implement it, and append one line to `DECISIONS.md` (`- [phase] chose X over Y because Z`).
2. **Work phase by phase** per `BUILD_PLAN.md`. After each phase: run that phase's
   acceptance checks, fix failures, then `git add -A && git commit` with a conventional
   message (`feat(api): ...`), then continue to the next phase. Do not skip ahead.
3. **Keep it runnable at every phase.** Never leave the repo in a non-building state at a
   commit boundary. If a phase can't fully build yet, stub the missing edge and note it.
4. **Read before writing.** Before editing a file, view it. Before adding a dependency,
   check it exists and matches the locked major version in `SPEC.md` §4.

## Stack guardrails (from SPEC §4 — do not deviate)
- TypeScript strict. ESM only. Node 24.
- pnpm + Turborepo monorepo. Never use npm/yarn.
- API = Hono. Dashboard = Next.js 15 App Router + React 19 + Tailwind 4 + shadcn/ui.
- DB = Postgres 16 + pgvector via Drizzle. Migrations via drizzle-kit.
- Jobs = BullMQ on Redis. Auth = Better Auth. Validation = zod.
- Widget = Preact in Shadow DOM, bundled by tsup. AI = pluggable provider (Ollama default).
- Lint/format = Biome. Tests = Vitest + Playwright.

## Code conventions
- Shared zod schemas in `packages/types` are the API contract. Derive TS types from zod
  (`z.infer`). Never duplicate request/response type definitions.
- Domain logic lives in `packages/core` services and is imported by both `apps/api` and
  `apps/worker`. Route handlers stay thin (parse → call service → serialize).
- IDs are prefixed nanoids (`post_`, `pk_`, `hk_`, etc.). Centralize generation.
- All env access goes through `packages/config` (zod-validated). No `process.env` reads
  scattered through the code.
- Errors: typed `AppError` with a `code` and HTTP status; a single Hono error middleware
  maps them to JSON `{ error: { code, message } }`.
- Every package has its own `package.json`, `tsconfig.json` extending `packages/tsconfig`,
  and a `README.md` stub.
- Respect the licensing split (SPEC §3): MIT packages must not import AGPL packages.
  The widget, widget-loader, mcp, and sdk packages depend only on `packages/types`
  (which must therefore stay dependency-light and safe to consume).

## Commands you should keep working
`pnpm dev` `pnpm build` `pnpm lint` `pnpm format` `pnpm test` `pnpm test:e2e`
`pnpm db:generate` `pnpm db:push` `pnpm db:seed`.

## What "done" means for a phase
- It builds (`pnpm build`) and lints clean (`pnpm lint`).
- Its acceptance checks in `BUILD_PLAN.md` pass.
- New logic has at least minimal Vitest coverage where SPEC §13 requires it.
- Committed to git.

## Things to never do
- Never implement tracked-user / per-vote metering (SPEC §1). Flat pricing only.
- Never auto-merge duplicate posts; only *suggest* (SPEC §11).
- Never put secrets in the repo. Never disable type-checking to "make it pass."
- Never build the v1 non-goals (SPEC §1): mobile SDK logic, helpdesk inbox, surveys,
  Salesforce/HubSpot, Kubernetes.
