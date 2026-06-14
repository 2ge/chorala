import { publicFeed } from '@chorala/core'
import { PortalVote, SubscribeForm } from '@/components/portal-client'

type Props = { projectId: string; publicKey: string; locale?: string }

export async function BoardView({ projectId, publicKey, locale }: Props) {
  const { posts } = await publicFeed.listPublicBoards(projectId, { locale, sort: 'top' })
  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display text-3xl tracking-[-0.02em]">Ideas</h2>
        <p className="mt-1 text-sm text-ink-soft">Vote for what you want us to build next.</p>
      </div>
      <div className="space-y-2.5">
        {posts.length === 0 && <p className="text-ink-faint">No ideas yet — be the first.</p>}
        {posts.map((p) => (
          <div
            key={p.id}
            className="surface flex items-start gap-4 p-4 transition hover:-translate-y-0.5"
          >
            <PortalVote
              publicKey={publicKey}
              postId={p.id}
              count={p.voteCount}
              voted={!!p.hasVoted}
            />
            <div className="min-w-0 pt-0.5">
              <p className="font-medium tracking-[-0.01em]">{p.title}</p>
              {p.body && <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{p.body}</p>}
              <p className="mt-1.5 text-xs text-ink-faint">{p.commentCount} comments</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export async function RoadmapView({ projectId, locale }: Props) {
  const { columns } = await publicFeed.getRoadmap(projectId, { locale })
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {columns.map((col) => (
        <div key={col.status.id}>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: col.status.color }} />
            <span className="font-semibold tracking-[-0.01em]">{col.status.name}</span>
          </div>
          <div className="space-y-2">
            {col.posts.length === 0 && <p className="text-xs text-ink-faint">Nothing here yet.</p>}
            {col.posts.map((p) => (
              <div key={p.id} className="surface p-3 text-sm">
                <p className="font-medium">{p.title}</p>
                <p className="mt-1 text-xs text-ink-faint">▲ {p.voteCount}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export async function ChangelogView({ projectId }: Props) {
  const entries = await publicFeed.getPublicChangelog(projectId)
  return (
    <div className="space-y-6">
      <div className="surface p-4">
        <p className="mb-2 text-sm font-semibold">Subscribe to updates</p>
        <SubscribeForm projectId={projectId} />
      </div>
      {entries.length === 0 && <p className="text-ink-faint">No changelog entries yet.</p>}
      {entries.map((e) => (
        <article key={e.id} className="border-b border-line pb-5">
          <div className="mb-1 flex items-center gap-2">
            {e.labels.map((l) => (
              <span key={l} className="rounded-full bg-ink/5 px-2 py-0.5 text-xs text-ink-soft">
                {l}
              </span>
            ))}
            {e.publishedAt && (
              <span className="text-xs text-ink-faint">
                {new Date(e.publishedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <h2 className="font-display text-xl tracking-[-0.01em]">{e.title}</h2>
          <p className="mt-1 whitespace-pre-wrap text-ink-soft">{e.body}</p>
        </article>
      ))}
    </div>
  )
}

/** Themed portal chrome shared by the /portal/[id] route and custom domains. */
export function PortalShell({
  name,
  brand,
  basePath,
  children,
}: {
  name: string
  brand: string
  basePath: string
  children: React.ReactNode
}) {
  const tabs: [string, string][] = [
    ['', 'Board'],
    ['roadmap', 'Roadmap'],
    ['changelog', 'Changelog'],
  ]
  return (
    <div style={{ ['--brand' as string]: brand }} className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-5 py-5">
          <h1 className="font-display text-2xl tracking-[-0.02em]">{name}</h1>
          <nav className="ml-auto flex gap-1 text-sm">
            {tabs.map(([slug, label]) => (
              <a
                key={label}
                href={`${basePath}${slug}`}
                className="rounded-full px-3 py-1.5 font-medium text-ink-soft transition hover:bg-ink/5 hover:text-ink"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8 rise">{children}</main>
      <footer className="mx-auto max-w-3xl px-5 pb-10 pt-4 text-xs text-ink-faint">
        Powered by <span className="font-display text-sm text-ink-soft">Chorala</span>
      </footer>
    </div>
  )
}
