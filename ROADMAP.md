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

### Phase 12 — Prioritization & triage workflow · *medium*
- Custom **numeric fields** on posts → pluggable **scoring** (RICE / ICE / custom weighted).
- **Saved views** (filter + sort + visible columns) + **CSV export**.
- **Vote on behalf** of a user (sales/support logging a request).
- Post **assignment / owner**; internal **rules** (on status change → tag / notify / sync).
- Builds on the `appVersion` filter pattern shipped in Phase‑9.5.

### Phase 13 — Segmentation & targeted communication · *medium*
- **Segments** = saved attribute queries over end‑users/companies (plan, MRR, locale, …).
- **Segment‑targeted changelog** — *leapfrog Canny, which can't do this at all.*
- **Segment‑restricted** roadmap/board visibility.
- Changelog **analytics** (views, email open/click) + **dynamic variables** (`{first_name}`,
  `{company_plan}`) — we already own the email pipeline (Resend) and notifications fan‑out.

### Phase 14 — AI capture ("Autopilot", done cheaper) · *large, biggest moat vs Canny*
- **Inbound connectors:** Intercom / Zendesk / Slack threads → AI extracts feature requests →
  files as **draft** posts for human review (never auto‑publish without opt‑in).
- **Auto‑categorize** new feedback into product areas (extends our existing clustering).
- **Smart follow‑up** replies; **"ask your feedback"** natural‑language query over posts.
- Runs on our **pluggable, bundled AI** — Canny bills $0.10/credit and Featurebase
  $0.29/resolution for the same thing; we do it at zero marginal cost on self‑host.

### Phase 15 — Integration breadth · *medium, post‑v1 — needs a DECISIONS note*
SPEC §1 caps v1 integrations at Slack/Linear/GitHub/webhooks. Expanding is a deliberate
post‑v1 call. Highest leverage: **Jira**, **Segment** (CDP identify), **Zapier/Make**
(unlocks the long tail for free), then Intercom/Zendesk/Discord.

### Phase 16 — Surveys & NPS · *medium, post‑v1, conflicts with SPEC §1 non‑goal*
Featurebase bundles in‑app micro‑surveys + NPS/CSAT, triggered by URL/segment, feeding the
feedback graph. SPEC marks surveys a v1 non‑goal — pursue only as an explicit post‑v1
expansion. Cheap once Phase 13 segmentation + the widget exist.

### Phase 17 — Enterprise & trust · *large, sell‑up tier*
SAML/SCIM admin SSO, custom admin roles (we have owner/admin/member today), **audit‑log UI**
(the `auditLog` entity already exists), moderation/spam queue, advanced privacy, EU residency.

---

## 4. Suggested sequencing

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
