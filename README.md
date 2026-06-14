# Heed

> **Heed** is an open-core, embeddable, multilingual, AI-native product-feedback
> platform — a self-hostable alternative to Canny / Featurebase / Frill.
>
> **We never charge you for your users voting.** Pricing (cloud) is flat per-admin;
> end-users and votes are always unlimited.

`Heed` is a placeholder brand token (package scope `@heed/*`, env prefix `HEED_`).

## What it is

- **Embeddable everywhere** — a tiny Preact widget in a Shadow DOM drops into any
  site with zero CSS leakage, plus a hosted portal, roadmap, and changelog.
- **Multilingual** — ideas auto-translate; users in different languages vote on the
  *same* canonical idea (cross-language voting).
- **AI-native** — dedup, clustering, summarization, and translation via a pluggable
  LLM provider (Ollama by default; OpenAI/Anthropic optional; degrades cleanly to off).
- **MCP server** — triage feedback from inside Claude / Cursor.
- **Open source (AGPL) + managed cloud** — self-host with one command, or let the
  cloud run the infrastructure.

## Repository layout

```
apps/        api (Hono) · dashboard (Next 15) · worker (BullMQ)
packages/    db · core · ai · email · billing · config · types   (AGPL)
             widget · widget-loader · mcp · sdk-react-native      (MIT)
             tsconfig                                             (shared config)
docker/      Dockerfiles + Caddyfile for the self-host stack
```

## Quick start

Self-host (one command):

```bash
cp .env.example .env          # set HEED_AUTH_SECRET (+ AI/email if wanted)
docker compose up             # postgres, redis, api, dashboard, worker, caddy
```

Local development:

```bash
pnpm install
pnpm db:push && pnpm db:seed
pnpm dev
```

Then open the dashboard, log in with the seeded admin, and load the widget demo at
`apps/dashboard/public/widget-demo.html`.

> Full guides (widget embed, end-user JWT/SSO, MCP setup, env reference, licensing,
> architecture, contributing) land in Phase 8.

## Licensing

Mixed open-core layout — see [`LICENSE`](./LICENSE) (AGPL-3.0, server side),
[`NOTICE`](./NOTICE), and the per-package MIT `LICENSE` files on the embed/SDK/MCP
surfaces. Rationale: companies will not embed AGPL JavaScript, so the widget, loader,
MCP, and SDK packages are MIT. See [`CLA.md`](./CLA.md).

## Status

Built phase-by-phase per [`BUILD_PLAN.md`](./BUILD_PLAN.md) against
[`SPEC.md`](./SPEC.md). Judgement calls are logged in [`DECISIONS.md`](./DECISIONS.md).
