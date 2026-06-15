import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

const GITHUB = 'https://github.com/2ge/chorala'
const DEMO = 'https://feedback.musicaha.com'

export const metadata: Metadata = {
  title: 'Chorala — open-source feedback boards, roadmap & changelog',
  description:
    'Collect product feedback, let users vote, and ship a roadmap + changelog people follow. AI Autopilot captures requests from support threads; revenue weighting and segments prioritise by MRR. Open-core, embeddable, API-first. Self-host or cloud — unlimited votes, always.',
  robots: { index: true, follow: true },
  alternates: {
    canonical: 'https://chorala.com',
    types: { 'application/json': 'https://chorala.com/api/v1/openapi.json' },
  },
  openGraph: {
    title: 'Chorala — every voice, in harmony',
    description:
      'Open-source feedback boards, voting, roadmap and changelog. Embeddable anywhere, multilingual, AI-native. Self-host or cloud.',
    url: 'https://chorala.com',
    siteName: 'Chorala',
    type: 'website',
  },
}

/* ---- tiny presentational helpers (server components) ---- */

function Mark({ className = '' }: { className?: string }) {
  return (
    <span className={`eq ${className}`} aria-hidden>
      <i />
      <i />
      <i />
      <i />
      <i />
    </span>
  )
}

function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent text-white shadow-[0_8px_18px_-8px_var(--color-accent)]">
        <Mark className="h-3.5 text-white" />
      </span>
      <span className="font-display text-[21px] tracking-[-0.02em]">Chorala</span>
    </span>
  )
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-raised/70 px-3 py-1 text-xs font-medium text-ink-soft">
      {children}
    </span>
  )
}

function Icon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  )
}

const FEATURES = [
  {
    name: 'Boards, voting & roadmap',
    icon: 'M7 14l3-3 3 2 4-5M5 5v14h14',
    body: 'Public idea boards where users post, upvote and discuss — anonymous or via SSO. Triage with statuses and tags, then publish a roadmap and a changelog that emails every voter the moment it ships.',
  },
  {
    name: 'AI Autopilot',
    icon: 'M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z',
    body: 'Paste a support thread → AI extracts the feature requests as drafts for review. Ask your feedback in plain English. Dedup, clustering and summaries on a pluggable provider (local Ollama by default) — nothing leaves your box.',
  },
  {
    name: 'Revenue-weighted priorities',
    icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
    body: 'Sync companies + MRR and see the dollars behind every request — “$40k of revenue wants this,” each account counted once. Filter the board by plan, company or MRR band.',
  },
  {
    name: 'Segments & targeted changelog',
    icon: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
    body: 'Build audiences from any attribute (plan, MRR, locale, domain) and announce only to the people an update is for — personalised with {{first_name}} and {{company}}. The thing Canny can’t do.',
  },
  {
    name: 'Embed widget + bug capture',
    icon: 'M9 7l-5 5 5 5M15 7l5 5-5 5',
    body: 'A two-line snippet drops a Preact widget into any site, sealed in a Shadow DOM. Bug boards capture annotated screenshots and browser/OS/version context automatically. Floating or inline, multilingual.',
  },
  {
    name: 'Developer-first by design',
    icon: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
    body: 'A typed SDK generated from an OpenAPI 3.1 spec, a self-discoverable API (RFC 8631/9727 + llms.txt), HMAC-signed webhooks, an inbound CDP webhook, GitHub & Discord, and a native MCP server for Claude / Cursor.',
  },
]

const WHY = [
  {
    title: 'Open-core. Own your data.',
    body: 'Run the entire stack yourself under AGPL — git clone, docker compose up, done — or let us host it. No lock-in, no black box, your database.',
  },
  {
    title: 'Honest, flat pricing.',
    body: 'You pay per admin seat. End-users and votes are unlimited on every plan, forever. We never meter your community or charge per tracked user.',
  },
  {
    title: 'AI-native, on your terms.',
    body: 'Dedup, clustering and summaries run through a provider you choose. Default to a local model so user feedback stays on your infrastructure.',
  },
  {
    title: 'Built to be loved.',
    body: 'Five themes, a tactile interface, fast everywhere, and fully multilingual. A feedback portal your users will actually want to use.',
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Embed or link',
    body: 'Paste a two-line snippet into your app, or just share your hosted portal URL. Live in minutes.',
  },
  {
    n: '02',
    title: 'Collect & prioritise',
    body: 'Users post ideas, vote and comment. AI dedupes and clusters the noise so the real signal rises to the top.',
  },
  {
    n: '03',
    title: 'Ship & close the loop',
    body: 'Move ideas across your roadmap, publish a changelog, and every voter hears back the moment it ships.',
  },
]

const ROADMAP: { label: string; tone: string; items: string[] }[] = [
  {
    label: 'Shipped',
    tone: 'shipped',
    items: [
      'Boards, voting, roadmap & changelog',
      'AI Autopilot: ingest → drafts · ask your feedback',
      'Companies + MRR revenue weighting',
      'Segments + targeted, personalised changelog',
      'Weighted scoring (RICE/ICE), CSV export, vote-on-behalf',
      'Bug capture: screenshots + auto context',
      'GitHub · Discord · inbound CDP webhook · MCP',
      'Typed SDK from OpenAPI · signed webhooks',
      'Multilingual · themes · one-command self-host',
    ],
  },
  {
    label: 'Next up',
    tone: 'now',
    items: [
      'In-app surveys & NPS / CSAT',
      'Enterprise: SAML / SCIM SSO',
      'Custom admin roles + audit log',
      'Moderation & spam queue',
    ],
  },
  {
    label: 'Exploring',
    tone: 'later',
    items: [
      'Jira / Intercom / Zendesk connectors',
      'AI smart-replies & auto-categorise',
      'Mobile SDK',
      'Salesforce / HubSpot',
    ],
  },
]

const PRICING = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    blurb: 'For side projects and getting started.',
    features: ['1 admin seat', 'Board, roadmap & changelog', 'Embeddable widget', 'Chorala badge'],
    cta: 'Start free',
    highlight: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$15',
    cadence: '/ month',
    blurb: 'For growing products that need their own home.',
    features: ['3 admin seats', 'Custom domain', 'AI Autopilot + dedup', 'GitHub & Discord'],
    cta: 'Start Starter',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$39',
    cadence: '/ month',
    blurb: 'For teams that want it fully theirs.',
    features: [
      '10 admin seats',
      'White-label (no badge)',
      'Revenue weighting & segments',
      'EU data residency',
    ],
    cta: 'Start Pro',
    highlight: true,
  },
]

const VOICES = [
  'Dark mode 🌙',
  'Bulk CSV export',
  'Native Linear sync',
  'Keyboard shortcuts',
  'Webhook retries',
  'SSO for the team',
  'Public API tokens',
  'Mobile push',
  'Custom statuses',
  'Slack alerts',
  'Per-board roles',
  'Markdown comments',
]

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* ---------- NAV ---------- */}
      <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
          <Wordmark />
          <div className="hidden items-center gap-7 text-sm text-ink-soft md:flex">
            <a className="transition hover:text-ink" href="#features">
              Features
            </a>
            <a className="transition hover:text-ink" href="#why">
              Why Chorala
            </a>
            <a className="transition hover:text-ink" href="#developers">
              Developers
            </a>
            <a className="transition hover:text-ink" href="#roadmap">
              Roadmap
            </a>
            <a className="transition hover:text-ink" href="#pricing">
              Pricing
            </a>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="hidden rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition hover:text-ink sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_22px_-12px_var(--color-accent)] transition hover:bg-accent-hover"
            >
              Start free
            </Link>
          </div>
        </nav>
      </header>

      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <span className="ripples floaty right-[-12rem] top-[2rem] hidden h-[34rem] w-[34rem] lg:block" />
          <span className="ripples right-[-6rem] top-[8rem] hidden h-[22rem] w-[22rem] lg:block" />
          <span className="ripples right-[0rem] top-[14rem] hidden h-[12rem] w-[12rem] lg:block" />
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-12 pt-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-24">
          <div>
            <div className="lift">
              <Pill>
                <Mark className="h-3 text-accent" />
                Open-source feedback platform
              </Pill>
            </div>
            <h1 className="lift mt-6 font-display text-[clamp(2.6rem,6vw,4.6rem)] font-medium leading-[1.02] tracking-[-0.025em]">
              Every voice,
              <br />
              in <span className="italic ink-underline">harmony</span>.
            </h1>
            <p
              className="lift mt-6 max-w-xl text-lg leading-relaxed text-ink-soft"
              style={{ animationDelay: '60ms' }}
            >
              Chorala turns scattered product feedback into a signal you can ship. Collect ideas,
              let users vote, and publish a roadmap and changelog people actually follow —
              embeddable anywhere, multilingual, and AI-native.
            </p>
            <div
              className="lift mt-8 flex flex-wrap items-center gap-3"
              style={{ animationDelay: '120ms' }}
            >
              <Link
                href="/login"
                className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_-14px_var(--color-accent)] transition hover:bg-accent-hover"
              >
                Start free — no card
              </Link>
              <a
                href={DEMO}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-line-strong bg-raised px-6 py-3 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
              >
                See a live board →
              </a>
            </div>
            <div
              className="lift mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-faint"
              style={{ animationDelay: '180ms' }}
            >
              <span className="flex items-center gap-1.5">
                <Dot /> Self-host in one command
              </span>
              <span className="flex items-center gap-1.5">
                <Dot /> Unlimited votes, always
              </span>
              <span className="flex items-center gap-1.5">
                <Dot /> AGPL + MIT open source
              </span>
            </div>
          </div>

          {/* hero product mock */}
          <div className="lift" style={{ animationDelay: '120ms' }}>
            <div className="floaty surface mx-auto max-w-md p-5">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <span className="font-display text-lg">Acme · Feedback</span>
                <span className="flex gap-1.5">
                  <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-white">
                    Board
                  </span>
                  <span className="rounded-full px-2.5 py-1 text-xs text-ink-faint">Roadmap</span>
                  <span className="rounded-full px-2.5 py-1 text-xs text-ink-faint">Changelog</span>
                </span>
              </div>
              <div className="mt-4 space-y-3">
                <MockPost
                  votes={142}
                  voted
                  title="Dark mode across the dashboard"
                  meta="In progress · 23 comments"
                />
                <MockPost
                  votes={97}
                  title="Webhooks for status changes"
                  meta="Planned · 11 comments"
                />
                <MockPost
                  votes={61}
                  title="Bulk CSV export of all posts"
                  meta="Under review · 8 comments"
                />
              </div>
              <div className="mt-4 rounded-xl border border-dashed border-line-strong px-4 py-3 text-center text-sm text-ink-faint">
                + Submit an idea
              </div>
              <div className="mt-4 flex items-center justify-end gap-1.5 text-[11px] text-ink-faint">
                Powered by <span className="font-display text-ink-soft">Chorala</span>
              </div>
            </div>
          </div>
        </div>

        {/* voices marquee */}
        <div className="marquee-mask border-y border-line/70 bg-raised/40 py-3.5">
          <div className="marquee-track">
            {[
              ...VOICES.map((v) => ({ v, k: `a-${v}` })),
              ...VOICES.map((v) => ({ v, k: `b-${v}` })),
            ].map((item) => (
              <span
                key={item.k}
                className="flex items-center gap-2 whitespace-nowrap rounded-full border border-line bg-raised px-3.5 py-1.5 text-sm text-ink-soft"
              >
                <span className="caret text-accent">▲</span>
                {item.v}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FEATURES ---------- */}
      <Section
        id="features"
        eyebrow="Everything in one place"
        title="The whole feedback loop, beautifully."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.name} className="tile surface p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Icon path={f.icon} />
              </span>
              <h3 className="mt-4 font-display text-xl">{f.name}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{f.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- WHY ---------- */}
      <Section
        id="why"
        eyebrow="Why Chorala"
        title="Feedback software that respects you and your users."
        alt
      >
        <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
          {WHY.map((w) => (
            <div key={w.title} className="bg-raised p-7">
              <h3 className="font-display text-2xl tracking-[-0.01em]">{w.title}</h3>
              <p className="mt-3 leading-relaxed text-ink-soft">{w.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- HOW IT WORKS ---------- */}
      <Section eyebrow="How it works" title="From signup to shipped in three moves.">
        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="relative rounded-2xl border border-line bg-raised/60 p-7">
              <span className="font-display text-5xl text-accent/25">{s.n}</span>
              <h3 className="mt-3 font-display text-xl">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-line bg-ink px-6 py-5 text-left font-mono text-[13px] leading-relaxed text-paper/90">
          <span className="select-none text-paper/40">{'// drop this on any page'}</span>
          <br />
          <span className="text-paper/60">&lt;script&gt;</span> Chorala(
          <span className="text-[var(--color-accent-soft)]">&apos;init&apos;</span>,{' '}
          {'{ projectKey: '}
          <span className="text-[var(--color-accent-soft)]">&apos;pk_live_…&apos;</span>
          {' }'}) <span className="text-paper/60">&lt;/script&gt;</span>
        </div>
      </Section>

      {/* ---------- FOR DEVELOPERS ---------- */}
      <Section
        id="developers"
        eyebrow="Built for developers"
        title="Open source, API-first, no black boxes."
        alt
      >
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-[15px] leading-relaxed text-ink-soft">
              The whole platform is on GitHub under <strong className="text-ink">AGPL</strong> (the
              widget, SDK and MCP are <strong className="text-ink">MIT</strong>, so you can embed
              them anywhere). Every endpoint is generated from one zod contract and published as an{' '}
              <strong className="text-ink">OpenAPI&nbsp;3.1</strong> spec — so the typed SDK, the
              docs and your own clients never drift.
            </p>
            <ul className="mt-6 space-y-3">
              {(
                [
                  ['OpenAPI 3.1 spec', '/api/v1/openapi.json'],
                  ['Interactive API docs', '/docs'],
                  ['Typed SDK — @chorala/sdk', GITHUB],
                  ['MCP server for Claude / Cursor', GITHUB],
                  ['llms.txt — discoverable by agents', '/llms.txt'],
                ] as [string, string][]
              ).map(([label, href]) => (
                <li key={label}>
                  <a
                    href={href}
                    target={href.startsWith('/') ? undefined : '_blank'}
                    rel="noreferrer"
                    className="group flex items-center gap-2.5 text-[15px] text-ink-soft transition hover:text-accent"
                  >
                    <span className="text-accent">→</span>
                    <span className="underline-offset-4 group-hover:underline">{label}</span>
                  </a>
                </li>
              ))}
            </ul>
            <a
              href={GITHUB}
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-flex items-center gap-2 rounded-full border border-line-strong bg-raised px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
            >
              ★ Star on GitHub
            </a>
          </div>

          <div className="space-y-3">
            <CodeCard title="embed.html" subtitle="One tag — the widget self-configures">
              {`<script async src="https://chorala.com/widget.js"
        data-chorala-key="pk_live_…"></script>`}
            </CodeCard>
            <CodeCard title="submit.sh" subtitle="Public API — votes & posts, no SDK needed">
              {`curl -X POST https://chorala.com/api/v1/public/posts \\
  -H "X-Chorala-Key: pk_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"boardSlug":"feature-requests",
       "title":"Dark mode","body":"please 🙏"}'`}
            </CodeCard>
            <CodeCard title="self-host.sh" subtitle="The full platform, your infrastructure">
              {`git clone https://github.com/2ge/chorala
cp .env.example .env
docker compose up   # → localhost, unlimited votes`}
            </CodeCard>
          </div>
        </div>
      </Section>

      {/* ---------- ROADMAP ---------- */}
      <Section
        id="roadmap"
        eyebrow="Built in the open"
        title="What we’ve shipped — and what’s next."
        alt
      >
        <div className="grid gap-4 md:grid-cols-3">
          {ROADMAP.map((col) => (
            <div key={col.label} className="surface p-6">
              <div className="flex items-center gap-2.5">
                <RoadDot tone={col.tone} />
                <h3 className="font-display text-lg">{col.label}</h3>
              </div>
              <ul className="mt-4 space-y-2.5">
                {col.items.map((it) => (
                  <li key={it} className="flex items-start gap-2.5 text-[15px] text-ink-soft">
                    <RoadDot tone={col.tone} small />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-ink-faint">
          Chorala runs its own roadmap on Chorala.{' '}
          <a
            href={GITHUB}
            target="_blank"
            rel="noreferrer"
            className="text-accent underline-offset-4 hover:underline"
          >
            Follow along or open a PR on GitHub →
          </a>
        </p>
      </Section>

      {/* ---------- PRICING ---------- */}
      <Section id="pricing" eyebrow="Pricing" title="Flat and fair. Pay per seat, never per vote.">
        <div className="grid items-stretch gap-4 lg:grid-cols-3">
          {PRICING.map((p) => (
            <div
              key={p.id}
              className={`tile relative flex flex-col rounded-2xl border p-7 ${
                p.highlight
                  ? 'border-accent bg-raised shadow-[0_24px_50px_-30px_var(--color-accent)]'
                  : 'border-line bg-raised'
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-7 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}
              <h3 className="font-display text-2xl">{p.name}</h3>
              <p className="mt-1 text-sm text-ink-soft">{p.blurb}</p>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="font-display text-5xl tracking-[-0.02em]">{p.price}</span>
                <span className="text-sm text-ink-faint">{p.cadence}</span>
              </div>
              <ul className="mt-6 space-y-2.5 text-[15px] text-ink-soft">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check />
                    <span>{f}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2.5 font-medium text-ink">
                  <Check />
                  <span>Unlimited end-users &amp; votes</span>
                </li>
              </ul>
              <Link
                href="/login"
                className={`mt-7 rounded-full px-5 py-2.5 text-center text-sm font-semibold transition ${
                  p.highlight
                    ? 'bg-accent text-white hover:bg-accent-hover'
                    : 'border border-line-strong text-ink hover:border-accent hover:text-accent'
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* self-host strip */}
        <div className="mt-4 flex flex-col items-center justify-between gap-4 rounded-2xl border border-line bg-ink px-7 py-6 text-paper sm:flex-row">
          <div>
            <h3 className="font-display text-xl">Self-host — free, forever</h3>
            <p className="mt-1 max-w-xl text-sm text-paper/70">
              The full platform is open source (AGPL). Run it on your own infrastructure with one
              command. Every feature, your data, zero per-seat cost.
            </p>
          </div>
          <a
            href={GITHUB}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-full bg-paper px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-white"
          >
            git clone &amp; go →
          </a>
        </div>
      </Section>

      {/* ---------- FINAL CTA ---------- */}
      <section className="px-5 py-20 sm:px-6">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[28px] border border-line bg-raised px-8 py-16 text-center">
          <span className="ripples left-1/2 top-[-10rem] h-[28rem] w-[28rem] -translate-x-1/2" />
          <span className="ripples left-1/2 top-[-5rem] h-[18rem] w-[18rem] -translate-x-1/2" />
          <h2 className="relative font-display text-[clamp(2rem,4.5vw,3.2rem)] font-medium leading-tight tracking-[-0.02em]">
            Ready to hear <span className="italic ink-underline">every voice</span>?
          </h2>
          <p className="relative mx-auto mt-4 max-w-lg text-ink-soft">
            Stand up a feedback portal in minutes. Free to start, open to inspect, yours to keep.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="rounded-full bg-accent px-7 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_-16px_var(--color-accent)] transition hover:bg-accent-hover"
            >
              Start free
            </Link>
            <a
              href={GITHUB}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-line-strong bg-paper px-7 py-3 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
            >
              ★ Star on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="border-t border-line/70">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Wordmark />
            <p className="mt-3 max-w-xs text-sm text-ink-soft">
              Every voice, in harmony. The open-source way to collect feedback, prioritise a
              roadmap, and ship what matters.
            </p>
          </div>
          <FooterCol
            title="Product"
            links={[
              ['Features', '#features'],
              ['Roadmap', '#roadmap'],
              ['Pricing', '#pricing'],
              ['Live demo', DEMO],
            ]}
          />
          <FooterCol
            title="Developers"
            links={[
              ['GitHub', GITHUB],
              ['API docs', '/docs'],
              ['OpenAPI spec', '/api/v1/openapi.json'],
              ['Self-host', GITHUB],
            ]}
          />
          <FooterCol
            title="Account"
            links={[
              ['Sign in', '/login'],
              ['Start free', '/login'],
            ]}
          />
        </div>
        <div className="border-t border-line/70">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-5 text-xs text-ink-faint sm:flex-row sm:px-6">
            <span>© 2026 Chorala · Open source under AGPL-3.0 &amp; MIT</span>
            <span className="flex items-center gap-1.5">
              <Mark className="h-3 text-accent" /> Made for teams who listen.
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ---- sub-components ---- */

function CodeCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: string
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-ink text-paper shadow-[0_18px_44px_-28px_rgba(28,24,21,0.6)]">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-2 font-mono text-xs text-paper/60">{title}</span>
        <span className="ml-auto hidden text-[11px] text-paper/40 sm:block">{subtitle}</span>
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[12.5px] leading-relaxed text-paper/90">
        <code>{children}</code>
      </pre>
    </div>
  )
}

function Section({
  id,
  eyebrow,
  title,
  alt,
  children,
}: {
  id?: string
  eyebrow: string
  title: string
  alt?: boolean
  children: ReactNode
}) {
  return (
    <section id={id} className={alt ? 'border-y border-line/60 bg-raised/30' : ''}>
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            {eyebrow}
          </span>
          <h2 className="mt-3 font-display text-[clamp(1.8rem,3.6vw,2.8rem)] font-medium leading-tight tracking-[-0.02em]">
            {title}
          </h2>
        </div>
        {children}
      </div>
    </section>
  )
}

function MockPost({
  votes,
  title,
  meta,
  voted,
}: {
  votes: number
  title: string
  meta: string
  voted?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="vote-pill min-w-[2.7rem] px-2 py-1.5 text-sm"
        data-voted={voted ? 'true' : 'false'}
      >
        <span className="caret">▲</span>
        {votes}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-medium text-ink">{title}</span>
        <span className="block text-xs text-ink-faint">{meta}</span>
      </span>
    </div>
  )
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map(([label, href]) => (
          <li key={label}>
            {href.startsWith('/') || href.startsWith('#') ? (
              <a className="text-ink-soft transition hover:text-accent" href={href}>
                {label}
              </a>
            ) : (
              <a
                className="text-ink-soft transition hover:text-accent"
                href={href}
                target="_blank"
                rel="noreferrer"
              >
                {label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Dot() {
  return <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
}

function Check() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 h-4 w-4 shrink-0 text-accent"
      aria-hidden="true"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function RoadDot({ tone, small }: { tone: string; small?: boolean }) {
  const color =
    tone === 'shipped'
      ? 'bg-accent'
      : tone === 'now'
        ? 'bg-accent/55'
        : 'border border-line-strong bg-transparent'
  const size = small ? 'mt-1.5 h-2 w-2' : 'h-2.5 w-2.5'
  return <span className={`inline-block shrink-0 rounded-full ${size} ${color}`} />
}
