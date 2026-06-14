# Chorala

> **Chorala** is an open-core, embeddable, multilingual, AI-native product-feedback
> platform — a self-hostable alternative to Canny / Featurebase / Frill.
>
> **We never charge you for your users voting.** Cloud pricing is flat per-admin;
> end-users and votes are always unlimited.

**Chorala** is the product (chorala.com). Internally the code keeps the `@chorala/*` package
scope and `CHORALA_` env prefix as stable identifiers (not user-visible).

- **Embeddable everywhere** — a tiny Preact widget in a Shadow DOM (≈12KB gzip) drops
  into any site with zero CSS leakage, plus a hosted portal, roadmap, and changelog.
- **Multilingual** — ideas auto-translate; users in different languages vote on the
  *same* canonical idea.
- **AI-native** — dedup suggestions, clustering, summarization, translation via a
  pluggable LLM provider (Ollama default; OpenAI/Anthropic optional; degrades to off).
- **MCP server** — triage feedback from inside Claude / Cursor.
- **Open source (AGPL) + managed cloud** — self-host with one command.

## Quick start

### Self-host (one command)

```bash
cp .env.example .env
# set CHORALA_AUTH_SECRET — e.g. openssl rand -base64 32
docker compose up
```

Caddy serves the stack on `:80` (set `CHORALA_DOMAIN=feedback.example.com` in `.env` for
automatic HTTPS). The API auto-runs migrations on boot. Create the first admin with:

```bash
docker compose exec api pnpm db:seed            # demo org + admin + sample data
docker compose exec api pnpm --filter @chorala/api seed:admin
# → admin@chorala.com / choralaadmin123
```

### Local development

```bash
pnpm install
docker compose up -d postgres redis             # or use your own PG16 + Redis
pnpm db:migrate && pnpm db:seed
pnpm --filter @chorala/api seed:admin              # sets the admin password
pnpm dev                                         # api :8787, dashboard :3015, worker
```

Open the dashboard (`:3015`), sign in, and load the widget demo at
`http://localhost:8787/widget-demo.html?key=<publicKey>`.

## Architecture

```
apps/        api (Hono :8787) · dashboard+portal (Next 15 :3015) · worker (BullMQ)
packages/    db (Drizzle+pgvector) · core (domain services) · ai (LLM providers + tasks)
             email · billing (Stripe, cloud-only) · config · types          (AGPL)
             widget · mcp · sdk-react-native (stub)          (MIT)
docker/      Dockerfile.{api,dashboard,worker} · Caddyfile
```

- **Type-safe end to end**: shared zod schemas in `packages/types` are the API contract.
- **Thin routes → core services → DB**: domain logic lives in `packages/core` and is
  shared by the API, worker, and dashboard.
- **Graceful degradation**: if AI/email isn't configured, those features are *disabled*,
  never broken.

## Widget embed guide

One tag — the floating widget self-configures from `data-*` attributes:

```html
<script async src="https://feedback.example.com/widget.js" data-chorala-key="pk_live_xxx"></script>
```

Optional: `data-mode` (`floating`|`inline`|`manual`), `data-locale`, `data-view`
(`board`|`roadmap`|`changelog`), `data-color`.

SSO is still one tag — pass the signed JWT as `data-jwt`:

```html
<script async src="https://feedback.example.com/widget.js"
        data-chorala-key="pk_live_xxx" data-jwt="eyJhbGci…"></script>
```

If the JWT is computed in JS, set `window.choralaSettings = { projectKey, user: { jwt } }`
before the script instead. Inline embeds and runtime control use the `Chorala(cmd, …)` API:
`init`, `identify(user)`, `open(view?)`, `close`, `render(selector, {view})`, `on(event, cb)`.

## End-user identity (SSO)

To identify your logged-in users (so votes are attributed and dedup'd), sign a JWT with
the project's **end-user JWT secret** (Project → Settings) using HS256:

```ts
import { SignJWT } from 'jose'
const token = await new SignJWT({ id: user.id, email: user.email, name: user.name, segment: { plan: 'pro', mrr: 4200 } })
  .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1h')
  .sign(new TextEncoder().encode(END_USER_JWT_SECRET))
```

Pass it to the widget: `Chorala('init', { projectKey, user: { jwt: token } })`. Anonymous
visitors fall back to a signed cookie. `segment` powers prioritization (e.g. weight votes
by MRR). Mirrors Canny/Featurebase SSO.

## MCP (triage from Claude / Cursor)

See [`packages/mcp/README.md`](packages/mcp/README.md). Create an `hk_…` key in
Project → API keys and register the server (stdio or streamable HTTP) — 9 tools incl.
`search_feedback`, `top_requests`, `summarize_post`, `draft_changelog_from_posts`.

## Environment

All vars are documented in [`.env.example`](.env.example). Required: `DATABASE_URL`,
`CHORALA_AUTH_SECRET`. Key optional groups: AI (`CHORALA_AI_PROVIDER` + model/base-url),
email (`CHORALA_EMAIL_TRANSPORT`), billing (`STRIPE_*`, cloud only), widget/public API
(`CHORALA_WIDGET_CDN_URL`, `CHORALA_RATE_LIMIT_PUBLIC`). `packages/config` zod-validates at
boot and fails fast on a missing required var.

## Cloud vs self-host

`CHORALA_DEPLOYMENT=selfhost` (default): no Stripe, no caps, unlimited admins.
`CHORALA_DEPLOYMENT=cloud`: Stripe billing + public signup + **admin-seat** limits per plan
(free/starter/pro). End-users and votes are **always unlimited** — never metered.
Billing code is fully inert in self-host.

## Scripts

`pnpm dev | build | lint | format | test | test:e2e | db:generate | db:push |
db:migrate | db:seed` — all wired through Turborepo.

## Licensing

Mixed open-core layout (see [`NOTICE`](NOTICE)):

- **AGPL-3.0** — repo root + server code (`apps/*`, `packages/{db,core,ai,email,billing,config,types}`). See [`LICENSE`](LICENSE).
- **MIT** — the embed/SDK/MCP surfaces (`packages/{widget,mcp,sdk-react-native}`),
  each with its own `LICENSE`, so companies can embed them without AGPL obligations. These
  packages import no AGPL code.

## Contributing

Sign the [CLA](CLA.md) (one click on your first PR). `pnpm install && pnpm build &&
pnpm lint && pnpm test` must pass. Judgement calls made while building are logged in
[`DECISIONS.md`](DECISIONS.md).

## Status / intentionally stubbed

- `packages/sdk-react-native` is a README-only stub (no native mobile SDK in v1).
- v1 integrations: Slack, Linear, GitHub, generic webhooks (webhook delivery is live;
  the Slack/Linear/GitHub specifics are scaffolded).
- AI features require a configured provider; with `CHORALA_AI_PROVIDER=none` they're cleanly disabled.
