# BUILD_PLAN.md — ordered execution plan

Execute phases **in order**. After each phase, run its **Acceptance** checks, fix any
failures, commit, then continue. Do not ask the human between phases.

---

## Phase 0 — Repo scaffold
- Create the full monorepo tree from `SPEC.md` §5.
- Root: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `biome.json`,
  `tsconfig` base, `.gitignore`, `.env.example` (generated from SPEC §6, every var
  documented with a comment), `README.md`, `LICENSE` (AGPL-3.0), `NOTICE`, `CLA.md`,
  `DECISIONS.md` (empty header).
- Create every package/app with its own `package.json` + `tsconfig.json` (even if empty
  bodies for now). MIT packages get their own `LICENSE`.
- `git init`, initial commit.
- **Acceptance:** `pnpm install` succeeds; `pnpm build` runs (even if no-ops); tree
  matches SPEC §5.

## Phase 1 — Data + config foundation
- `packages/config`: zod-validated env loader (SPEC §6), fails fast on missing required.
- `packages/types`: zod schemas for every entity + API request/response (the contract).
- `packages/db`: full Drizzle schema (SPEC §7), client, `drizzle.config.ts`, generated
  migrations, `seed.ts` (SPEC §7 seed requirements), pgvector extension + index.
- Wire `db:generate|push|migrate|seed` scripts.
- **Acceptance:** `pnpm db:push && pnpm db:seed` against the compose Postgres creates all
  tables and seed data; a smoke test reads a seeded post back.

## Phase 2 — Core domain + API skeleton
- `packages/core`: services for orgs, projects, boards, posts, votes, comments, statuses,
  tags, changelog, members, api_keys (CRUD + business rules, no HTTP).
- `apps/api`: Hono app, error middleware, Better Auth mounted, admin REST routes (SPEC
  §8.1) calling core services, API-key auth middleware, request validation via types.
- `/widget.js` static route stub.
- **Acceptance:** Vitest covers core services (happy + key edge cases); `curl` against a
  running API can authenticate and CRUD a project/board/post; `pnpm test` green.

## Phase 3 — Public/widget API + identity
- `apps/api`: public routes (SPEC §8.2): boards/posts read, create post, vote toggle,
  comment, roadmap, changelog, identify.
- End-user JWT verification (HS256 with project secret) + anonymous cookie fallback.
- CORS per-project `allowed_origins`; Redis rate limiting.
- **Acceptance:** Vitest integration tests: anonymous + JWT-identified flows for
  read/create/vote/comment; CORS rejects a disallowed origin; rate limit triggers.

## Phase 4 — Widget (embed everywhere)
- `packages/widget-loader`: <2KB queue+loader snippet.
- `packages/widget`: Preact app in Shadow DOM — board view (list/submit/vote/comment),
  roadmap view, changelog view, floating + inline + manual modes, theming, i18n strings,
  `locale: auto`. tsup build → IIFE `widget.js`, served by API.
- `apps/dashboard/public/widget-demo.html`: a plain HTML page embedding the widget
  against the local public API (proves "works on any site").
- **Acceptance:** opening `widget-demo.html` (pointed at local API) lets you submit an
  idea, see it on the board, and vote — with zero CSS leakage from/into the host page.

## Phase 5 — Dashboard + portal + roadmap + changelog
- `apps/dashboard`: Better Auth login; admin UI for boards/posts (triage, status change,
  pin, merge-suggestions, tags, internal comments), changelog editor (draft/publish),
  project settings (widget config, allowed origins, public key, end-user secret, custom
  domain), members/invites, api keys, integrations + webhooks config, basic analytics.
- Public portal pages (server-rendered): board, post detail, roadmap, changelog,
  changelog subscribe — themeable, multilingual, usable on a project's custom domain.
- **Acceptance:** the e2e journey in SPEC §13 passes in Playwright; admin can run the
  whole triage loop in the UI.

## Phase 6 — AI layer + worker + cross-language
- `packages/ai`: `LLMProvider` + Ollama/OpenAI/Anthropic/Noop + factory from env.
- `apps/worker`: BullMQ workers for `embedPost`, `dedupPost`, `translatePost`,
  `clusterThemes`, `summarize`, plus webhook delivery + email sending.
- Public/admin APIs enqueue jobs on the right events. Dedup surfaces *suggestions* only.
  Translations enable cross-language voting on the canonical post.
- `packages/email`: React Email templates + SMTP/Resend/Noop transport (notifications,
  changelog, magic link).
- **Acceptance:** with `CHORALA_AI_PROVIDER=ollama` running, a new post gets an embedding,
  a near-duplicate produces a merge suggestion, and a post is translated into a second
  org locale and votable from that locale. With `CHORALA_AI_PROVIDER=none` everything still
  runs and AI features are cleanly disabled. Vitest covers task logic with a mock provider.

## Phase 7 — MCP server
- `packages/mcp`: tools from SPEC §10, API-key auth, stdio + streamable HTTP transports.
- README with exact Claude Desktop / Claude Code registration config.
- **Acceptance:** running the MCP server over stdio and calling `search_feedback` and
  `top_requests` returns correct data from the seeded DB.

## Phase 8 — Cloud flag, billing, packaging, docs
- `packages/billing`: Stripe wired, fully inert unless `CHORALA_DEPLOYMENT=cloud`; cloud
  signup + admin-seat limits (never user/vote limits).
- `docker/`: Dockerfiles for api/dashboard/worker, `Caddyfile`; root `docker-compose.yml`
  (postgres+pgvector, redis, api, dashboard, worker, caddy) that runs the whole stack.
- `.github/workflows/ci.yml` (install, lint, build, test) + `cla.yml` stub.
- `README.md`: quick start (self-host one-command + local dev), widget embed guide,
  end-user JWT/SSO guide, MCP setup, env reference, licensing explanation, architecture
  overview, contributing.
- **Acceptance:** `docker compose up` from a clean checkout (with a filled `.env`) brings
  up a working instance reachable via Caddy; `CHORALA_DEPLOYMENT=selfhost` needs no Stripe;
  CI is green.

---

## Final self-check before reporting done
- `pnpm install && pnpm build && pnpm lint && pnpm test` all green.
- `docker compose up` yields a working dashboard + portal + widget demo + worker.
- `DECISIONS.md` lists every judgement call you made.
- Print a short "what I built / how to run / what's stubbed for later (mobile SDK,
  extra integrations)" summary.
