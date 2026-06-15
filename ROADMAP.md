# Chorala — Competitive Roadmap

> How we get from "solid feedback tool" to "better than Canny / Featurebase."
> `SPEC.md` is still the contract for v1. This file is the *post‑v1 plan*: where the
> competition is ahead, where we're already ahead, and the order we close the gap.
> Phases continue `BUILD_PLAN.md` numbering (0–8 shipped, 9 = Notifications shipped).

Last updated: 2026‑06‑15.

---

## 1. Where we already win (lean into these — don't dilute them)

These are structural advantages the incumbents **cannot easily copy**. Every phase below
should reinforce, never undercut, them.

| Edge | Us | Canny | Featurebase |
|---|---|---|---|
| **Pricing** | Flat per‑admin. Users & votes always free. | Meters "tracked users" | Meters support seats + **$0.29/AI resolution** |
| **AI cost** | Bundled, pluggable, **Ollama default = $0** | **$0.10/credit** on top of plan | Per‑resolution billing |
| **Open source / self‑host** | AGPL core + MIT widget/SDK/MCP, `docker compose up` | Closed SaaS | Closed SaaS |
| **Cross‑language ideas** | Auto‑translate so EN/ES/FR users vote on the **same** idea | UI localization only | UI localization (40+) only |
| **MCP‑native** | Day‑one, triage from Claude/Cursor | Added late (2025–26) | Has one |

**Headline that stays true through every phase:** *"We never charge you for your users
voting, and we never charge you per AI call."* Both incumbents now meter the two things
that scale with success (engaged users, AI usage). That is the wedge.

---

## 2. The gap, ranked (what they have that we don't)

Ordered by *competitive damage if we don't have it*:

1. **B2B revenue intelligence** — companies/accounts, MRR attributes, revenue‑weighted
   prioritization ("this is asked for by $40k of MRR"). Canny's single biggest sales hook.
   We have `endUser.metadata`/`segment` jsonb but **no company entity, no MRR, no weighting.**
2. **AI capture from support channels** (Canny "Autopilot") — AI reads Intercom/Zendesk/Slack
   threads and files feature requests automatically. Their flagship. We have **zero** inbound‑AI capture.
3. **Bug‑report capture** — screenshot + annotation + auto context. Featurebase & Sentry both
   do it. We just shipped the *storage* half (`appVersion` + `context`); the **widget capture half is missing.**
4. **Prioritization beyond votes** — scoring frameworks (RICE/ICE/weighted), custom numeric
   fields, saved views, CSV export. We have raw vote counts only.
5. **Segmentation + targeted comms** — segment‑restricted roadmaps and *segment‑targeted
   changelog*. (Note: **Canny can't segment its changelog at all** — this is a gap we can leapfrog.)
6. **Triage workflow** — vote‑on‑behalf, assignment/owner, internal rules/automations,
   moderation/spam queue. Ours is thin.
7. **Integration breadth** — Jira, Intercom, Zendesk, Segment (CDP), Zapier, Discord. We have
   Slack/Linear/GitHub/webhooks (SPEC v1 cap).
8. **Surveys / NPS / CSAT** — Featurebase bundles them. SPEC lists as a v1 non‑goal.
9. **Enterprise trust** — SAML/SCIM, custom admin roles, audit‑log UI, advanced privacy.

**Deliberately NOT chasing** (incumbent bloat, against SPEC §1): full helpdesk inbox / AI
support agent (Featurebase "Fibi"), bundled knowledge base, Salesforce/HubSpot, native
mobile SDKs, Kubernetes. Staying feedback‑first *is* the positioning.

---

## 3. Phased plan

Principle: **each phase ships standalone, builds on the prior, and starts small.** Early
phases are days of work on our existing schema; later phases are platform investments.

### Phase 10 — Bug‑report capture (finish what we started) · *small* · ✅ SHIPPED 2026‑06‑15
The `context` jsonb + first‑class `appVersion` landed 2026‑06‑15; Phase 10 made the widget fill them.
- ✅ Auto‑collect Sentry‑style **contexts** client‑side (`browser`, `os`, `url`, `locale`,
  `screen`, `viewport`, `timezone`, `referrer`) into the `context` map on every submission — no host config.
- ✅ **Screenshot + annotate** (redact/highlight) on bug boards — capture via the Screen Capture
  API, file pick, or paste; stored as a linked, disk‑backed attachment metered against per‑file
  (5 MB) + per‑project (1 GB) quotas (not inlined). Admin sees thumbnails on post detail.
- ✅ Bug boards (`kind=bug`) get the screenshot control + a bug‑framed form; the Context panel
  renders the auto‑collected map. Host opt‑in for version via `data-app-version` / `Chorala.init({ appVersion })`.

### Phase 11 — B2B revenue intelligence · *medium, highest sales value* · ✅ SHIPPED 2026‑06‑15
Closed gap #1 — the thing that makes us sellable to B2B SaaS.
- ✅ `companies` entity; `endUser.companyId`; company holds `mrr`, `plan`, `domain`, metadata.
- ✅ Identify JWT extended with an optional `company` claim → upserts the account (keyed by
  external id) and stamps `company_id` on the user, every identify.
- ✅ **Revenue‑weighted prioritization:** post value = Σ MRR of the *distinct* companies whose
  users voted (a company with 3 voters counts once). `?sort=revenue` + a green $ badge on the
  posts list — *alongside* the raw vote count, never replacing it.
- ✅ Filter posts by company / plan / minMrr (`?companyId=`, `?plan=`, `?minMrr=`); Companies
  dashboard tab with per‑account rollups; "Customer" card on post detail (who asked + MRR).
- *Honors the pricing promise:* weights by revenue **without** metering or charging per user.

### Phase 12 — Prioritization & triage workflow · *medium* · ✅ SHIPPED 2026‑06‑15
- ✅ Custom **numeric fields** (`score_fields`, per‑project key/label/weight) → **weighted
  score** = Σ (value × weight). Negative weights model cost inputs (Effort = −1) for RICE/ICE‑
  style frameworks. `?sort=score` + a ★ badge; managed in Settings, set on each post detail.
- ✅ **CSV export** of the (filtered) list — `?format=csv`, one column per score field, plus
  votes/revenue/score/status/board. "Export CSV" button on the posts page.
- ✅ **Vote on behalf** of a customer (`POST /posts/:id/vote-for` by email/externalId — upserts
  an identified end‑user, idempotent). Form on the post detail.
- ✅ Post **assignment / owner** (`assignee_member_id`) + `?assignee=` filter; owner select on
  the detail.
- **Deferred** (conscious cut): saved views and a status‑change **rules engine** — see DECISIONS;
  the worker already fires notify/integration‑sync on status change.

### Phase 13 — Segmentation & targeted communication · *medium* · ✅ SHIPPED 2026‑06‑15
- ✅ **Segments** (`segments` table) = a saved predicate over end‑users + their company
  (`plan`, `mrr`, `locale`, `email_domain`, `has_company`; match all/any). A builder with a
  **live match count** preview (`POST /segments/preview`); Segments dashboard tab.
- ✅ **Segment‑targeted changelog** — `changelog_entries.segment_id`; on publish the fan‑out
  resolves the segment and emails **only** matching end‑users (else all subscribers), recording
  `recipient_count`. *The changelog segmentation Canny can't do.*
- ✅ **Dynamic variables** — `{{first_name}}`, `{{name}}`, `{{email}}`, `{{company}}`,
  `{{plan}}` rendered per‑recipient in the changelog email. Reuses the Resend pipeline + fan‑out.
- ✅ Lightweight analytics: `recipient_count` ("N emailed") shown on each entry.
- **Deferred** (DECISIONS): segment‑restricted roadmap/board visibility (invasive on the public
  read path) and email open/click pixel tracking.

### Phase 14 — AI capture ("Autopilot", done cheaper) · *large* · ✅ SHIPPED 2026‑06‑15
- ✅ **Ingest → extract → review.** `POST /ingest` takes a raw support conversation;
  `extractFeatureRequests` pulls out distinct requests as **pending** posts (hidden from the
  public board + default list). A human approves (`/approve` → live) or dismisses (`/dismiss`)
  in the **Review queue** — never auto‑published.
- ✅ **"Ask your feedback"** — `POST /ask` answers a natural‑language question over a project's
  posts (semantic search + LLM synthesis when enabled).
- ✅ **Graceful degradation (SPEC §2):** AI off → ingest still captures the conversation as one
  request; ask falls back to a keyword match. So Autopilot is useful at $0, and AI only makes it
  *smarter* — Canny bills $0.10/credit and Featurebase $0.29/resolution for the same thing.
- ✅ Dashboard **Autopilot** tab: paste‑to‑capture, ask box, review queue with source badges.
- **Deferred** (DECISIONS): real Intercom/Zendesk/Slack **OAuth** connectors (need external app
  registration, same blocker as GitHub OAuth — the generic `/ingest` endpoint *is* the connector
  contract they post to); auto‑categorize‑to‑board and AI smart‑reply.

### Phase 15 — Integration breadth · *medium* · ✅ SHIPPED 2026‑06‑15 (partial — see deferred)
- ✅ **Segment‑compatible inbound webhook** — `POST /inbound/:projectId` (Bearer = per‑project
  secret) accepts `identify`/`group` events → auto‑upserts end‑users + companies (and links them).
  Auto‑populates the data that powers revenue weighting (P11) + segments (P13) with no JWT wiring.
- ✅ **Discord outbound** — post new feedback + shipped changelog entries to a Discord channel.
- ✅ Settings cards for both. Zapier/Make work today via the existing webhooks + REST API.
- **Deferred** (DECISIONS): Jira / Intercom / Zendesk **OAuth** connectors — same external‑app
  blocker as GitHub OAuth; the `/inbound` webhook + Phase‑14 `/ingest` already cover the inbound
  half. Discord delivery is fire‑and‑forget (not live‑tested without a real webhook URL).

### Phase 15 (orig.) — Integration breadth · *needs a DECISIONS note*
SPEC §1 caps v1 integrations at Slack/Linear/GitHub/webhooks. Expanding is a deliberate
post‑v1 call. Highest leverage: **Jira**, **Segment** (CDP identify), **Zapier/Make**
(unlocks the long tail for free), then Intercom/Zendesk/Discord.

### Phase 16 — Surveys & NPS · ✅ SHIPPED
In‑app micro‑surveys + **NPS / CSAT / CES / rating / open‑text / multiple‑choice**, optionally
**targeted at a segment** (reusing Phase 13), rendered on the portal and answered once per user.
Results aggregate into the same admin surface: response count, **NPS score**, CSAT top‑box %,
average, value distribution, choice tallies, and recent free‑text. Surfaced as an explicit
post‑v1 expansion beyond SPEC §1's non‑goal, kept flat‑priced (no per‑response metering).

### Phase 17 — Enterprise & trust · ✅ SHIPPED (SAML/SCIM deferred)
- **Custom admin role** — a `moderator` role between admin and member: runs the moderation
  queue but can't touch billing, members or projects (`canModerate` capability + write-scoped
  API keys).
- **Audit‑log UI** — every governance action (member invite/role/remove, project CRUD, org
  settings, API‑key create/revoke, post status changes, moderation) is appended to the org's
  immutable `audit_log` and surfaced in an admin‑only timeline that resolves actor → name/email.
- **Moderation / spam queue** — a deterministic (no‑AI) spam heuristic flags suspicious public
  posts & comments at submit time; a moderator can **Approve** (clear flag), **Hide** (drop from
  the public board, kept for audit) or **Restore**. Hidden content leaves the feed and the
  comment count; nothing is ever auto‑deleted.

Deferred: **SAML/SCIM admin SSO** (needs an external IdP — Okta/Azure AD app registration we
can't self‑provision), advanced privacy & EU data residency. See DECISIONS.md.

---

## 4. Best‑on‑market — the rest of the surface (Phases 18+)

After 16–17 the core is unbeatable; these close every remaining gap against the *whole* field
(Canny, Featurebase, Frill, Nolt, Upvoty, Sleekplan, Productboard, Aha!). Demand‑ordered, each
one phase. Several need external credentials (OAuth apps, an IdP) we can't self‑provision yet —
flagged ⛔; the rest are fully buildable on the current stack.

### Phase 18 — Integrations, completed
**Jira** & **Linear** two‑way sync, full **Slack** (post + slash actions), **Intercom** /
**Zendesk** ⛔ (pull conversations, push status), **Zapier / Make** (publish triggers + actions
on top of webhooks), **Notion / ClickUp / Azure DevOps / Asana**. Closes the integrations matrix
every incumbent advertises. (Extends the deferred half of Phase 15.)

### Phase 19 — Analytics & insights · ✅ SHIPPED
- **Analytics dashboard** — headline KPIs (posts/votes/comments/active voters) with
  this‑window‑vs‑previous trend arrows, **vote + post velocity** sparklines, a **board‑health**
  table (open/planned/in‑progress/shipped/votes per board), status distribution, top themes
  (tag volume), and **top requests by votes, by revenue (MRR), and by evidence** — all
  deterministic SQL, so it works with `provider=none` (no AI dependency).
- **Insight linking (quotes → features)** — the Productboard wedge: attach a customer quote
  (source + email + auto‑linked company/MRR) to any post; the "most evidenced" ranking shows
  which requests have the most real demand behind them, not just raw votes.
- **Exportable report** — `GET /analytics?format=csv` (and an admin Export‑CSV button)
  streams the summary + board‑health as CSV.

Deferred: **AI sentiment** (needs a provider — lands in Phase 20 AI depth) and **PDF** export
(CSV covers the report need today). See DECISIONS.md.

### Phase 20 — AI depth (Autopilot v2)
Sentiment scoring, **auto‑categorise** new feedback to boards/tags (extends clustering),
AI **smart‑reply** drafting, AI roadmap suggestions, and weekly **AI digests** ("what your users
asked for this week"). All on the bundled/Ollama provider — still no per‑credit AI tax.

### Phase 21 — Automation & workflow engine
A rules engine: on event → tag / assign / set status / notify / sync. Auto‑tagging, SLAs, and
**saved views** (filters + columns + sort). The deferred pieces of Phase 12, generalised.

### Phase 22 — Roadmap & prioritization power
Multiple roadmap **views** (now/next/later, timeline/Gantt), **private & internal** roadmaps,
a value×effort **prioritization matrix**, and framework templates (RICE / ICE / custom) layered
on the Phase‑12 scoring.

### Phase 23 — Notifications & digests
Weekly email **digests**, per‑user notification preferences, **Slack / Teams** (Discord shipped),
customisable email templates, and web push. Builds on the existing fan‑out + Resend pipeline.

### Phase 24 — Community & moderation
Spam + profanity filters, user **reputation/karma**, **pinned & locked** posts, report‑abuse,
and a comment moderation queue. (Overlaps Phase 17's moderation; this is the community‑scale depth.)

### Phase 25 — Capture surfaces breadth
In‑app **changelog widget/popover**, **roadmap embed**, a floating **feedback button**,
an **email‑to‑board** address, and a **browser extension** — every place feedback is born.

### Phase 26 — Mobile
A real **React Native SDK** (the v1 stub → shipped) + native bridges, mobile push, and a
mobile‑optimised portal. (SPEC §1 made mobile a v1 non‑goal — a conscious post‑v1 call.)

### Phase 27 — Privacy, compliance & data
GDPR **export/delete** tooling, retention policies, anonymisation, audit exports, a SOC 2 path,
and configurable **data residency**. Pairs with Phase 17; required to sell to regulated buyers.

### Phase 28 — White‑label & multi‑brand
Custom CSS/branding, email branding, **multiple brands per org**, and a fully unbranded portal —
the agency / multi‑product tier.

### Deliberately NOT building (it's the positioning, not a gap)
Full **helpdesk / ticketing inbox**, an **AI support agent** (Featurebase "Fibi"), a bundled
**knowledge base**, and being a generic **CRM of record**. Staying feedback‑first — and flat‑priced,
open‑core, with bundled AI — is *why* we win. We integrate with those tools (Phase 18), we don't
become them.

**Net:** with 16–28 done, Chorala matches or beats every competitor on every axis they market,
while keeping the three things none of them have together — **flat pricing (users/votes free),
open‑core/self‑host, and bundled AI at $0 marginal cost.**

---

## 5. Suggested sequencing (original core spine)

```
NOW ──► 10 (bug capture)  ──► 11 (companies + MRR)  ──► 12 (scoring/triage)  ──► 13 (segments)
                                                                                     │
        14 (AI capture) ◄──────────────────────────────────────────────────────────┘
        then, as demand dictates: 15 (integrations) · 16 (surveys) · 17 (enterprise)
```

10 → 11 → 12 → 13 is the "make the core feedback product genuinely better than theirs" spine
and is all incremental work on the current schema. 14 is the headline differentiator once the
core is tight. 15–17 are demand‑driven and two of them (15, 16) need a conscious step past
SPEC's v1 non‑goals — record those in `DECISIONS.md` when we take them.

**Recommended next build: Phase 10** — it's the smallest, finishes the metadata work already
in flight, and ships the most visible polish per hour.
