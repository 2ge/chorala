import {
  boards as boardSvc,
  companies as companySvc,
  posts as postSvc,
  scoreFields as scoreFieldSvc,
  statuses as statusSvc,
} from '@chorala/core'
import type { PostSort } from '@chorala/types'
import Link from 'next/link'
import { PinButton, StatusSelect } from '@/components/post-controls'
import { Badge, Button, Card, Input, Label, Select, VotePill } from '@/components/ui'
import { adminCreatePost } from '@/lib/actions'
import { requireAuthContext } from '@/lib/session'

const money = (n: number) => `$${n.toLocaleString('en-US')}`

export default async function PostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ appVersion?: string; companyId?: string; sort?: string }>
}) {
  const { projectId } = await params
  const { appVersion, companyId, sort: sortRaw } = await searchParams
  const byRevenue = sortRaw === 'revenue'
  const byScore = sortRaw === 'score'
  const sort: PostSort = byRevenue ? 'revenue' : byScore ? 'score' : 'top'
  const ctx = await requireAuthContext()
  const [posts, statuses, boards, company, scoreFields] = await Promise.all([
    postSvc.listPosts(ctx, projectId, { appVersion, companyId, sort }),
    statusSvc.listStatuses(ctx, projectId),
    boardSvc.listBoards(ctx, projectId),
    companyId ? companySvc.getCompany(ctx, projectId, companyId).catch(() => null) : null,
    scoreFieldSvc.listScoreFields(ctx, projectId),
  ])
  const hasScoring = scoreFields.length > 0
  const statusById = new Map(statuses.map((s) => [s.id, s]))
  const exportHref = `/api/v1/projects/${projectId}/posts?format=csv${appVersion ? `&appVersion=${encodeURIComponent(appVersion)}` : ''}${companyId ? `&companyId=${companyId}` : ''}&sort=${sort}`
  const qs = (next: Record<string, string | undefined>) => {
    const sp = new URLSearchParams()
    if (appVersion) sp.set('appVersion', appVersion)
    if (companyId) sp.set('companyId', companyId)
    for (const [k, v] of Object.entries(next)) v ? sp.set(k, v) : sp.delete(k)
    const s = sp.toString()
    return `/admin/${projectId}/posts${s ? `?${s}` : ''}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-[-0.02em]">Posts</h1>
          <p className="mt-1 text-sm text-ink-soft">Triage what your users are asking for.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-line bg-raised p-0.5 text-xs font-semibold">
            <Link
              href={qs({ sort: undefined })}
              className={`rounded-full px-2.5 py-1 transition ${!byRevenue && !byScore ? 'bg-accent text-white' : 'text-ink-soft hover:text-ink'}`}
            >
              Top
            </Link>
            <Link
              href={qs({ sort: 'revenue' })}
              className={`rounded-full px-2.5 py-1 transition ${byRevenue ? 'bg-accent text-white' : 'text-ink-soft hover:text-ink'}`}
            >
              Revenue
            </Link>
            {hasScoring && (
              <Link
                href={qs({ sort: 'score' })}
                className={`rounded-full px-2.5 py-1 transition ${byScore ? 'bg-accent text-white' : 'text-ink-soft hover:text-ink'}`}
              >
                Score
              </Link>
            )}
          </div>
          <a
            href={exportHref}
            className="rounded-full border border-line bg-raised px-3 py-1 text-xs font-semibold text-ink-soft transition hover:text-ink"
          >
            Export CSV
          </a>
          <span className="rounded-full border border-line bg-raised px-3 py-1 text-sm font-semibold tabular-nums">
            {posts.length} ideas
          </span>
        </div>
      </div>

      {appVersion && (
        <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent-soft px-4 py-2.5 text-sm">
          <span className="text-ink-soft">
            Filtered to app version <span className="font-semibold text-accent">v{appVersion}</span>
          </span>
          <Link
            href={qs({ appVersion: undefined })}
            className="ml-auto font-medium text-ink-soft transition hover:text-ink"
          >
            Clear ✕
          </Link>
        </div>
      )}

      {companyId && (
        <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent-soft px-4 py-2.5 text-sm">
          <span className="text-ink-soft">
            Requests from{' '}
            <span className="font-semibold text-accent">{company?.name ?? 'this company'}</span>
            {company ? ` · ${money(company.mrr)} MRR` : ''}
          </span>
          <Link
            href={`/admin/${projectId}/posts`}
            className="ml-auto font-medium text-ink-soft transition hover:text-ink"
          >
            Clear ✕
          </Link>
        </div>
      )}

      <Card className="p-4">
        <form action={adminCreatePost} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="projectId" value={projectId} />
          <div className="grow">
            <Label>New post</Label>
            <Input name="title" placeholder="Title of a new idea…" required minLength={2} />
          </div>
          <div>
            <Label>Board</Label>
            <Select name="boardId" defaultValue={boards[0]?.id}>
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit">Add idea</Button>
        </form>
      </Card>

      <Card className="divide-y divide-line/70 overflow-hidden p-0">
        {posts.length === 0 && (
          <p className="p-10 text-center text-ink-faint">
            No posts yet — add your first idea above.
          </p>
        )}
        {posts.map((p) => {
          const status = p.statusId ? statusById.get(p.statusId) : null
          return (
            <div
              key={p.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition hover:bg-paper/60"
            >
              <VotePill count={p.voteCount} size="sm" />
              <div className="min-w-0 grow">
                <Link
                  href={`/admin/${projectId}/posts/${p.id}`}
                  className="font-medium tracking-[-0.01em] transition hover:text-accent"
                >
                  {p.title}
                </Link>
                <div className="mt-1 flex items-center gap-2.5 text-xs text-ink-faint">
                  {status && <Badge color={status.color}>{status.name}</Badge>}
                  {p.appVersion && (
                    <Link
                      href={`/admin/${projectId}/posts?appVersion=${encodeURIComponent(p.appVersion)}`}
                      className="font-mono text-[11px] text-ink-faint transition hover:text-accent"
                    >
                      v{p.appVersion}
                    </Link>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden
                    >
                      <title>comments</title>
                      <path d="M21 11.5a8.4 8.4 0 01-9 8 9 9 0 01-4-1L3 20l1.5-4.5A8.4 8.4 0 1121 11.5z" />
                    </svg>
                    {p.commentCount}
                  </span>
                  {p.revenueImpact > 0 && (
                    <span
                      title="Total MRR of the companies whose users voted for this"
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-semibold tabular-nums text-emerald-600 dark:text-emerald-400"
                    >
                      {money(p.revenueImpact)}
                    </span>
                  )}
                  {hasScoring && p.score !== 0 && (
                    <span
                      title="Weighted priority score"
                      className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 font-semibold tabular-nums text-accent"
                    >
                      ★ {p.score}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                <PinButton projectId={projectId} postId={p.id} pinned={p.isPinned} />
                <div className="w-36 sm:w-44">
                  <StatusSelect
                    projectId={projectId}
                    postId={p.id}
                    statusId={p.statusId}
                    statuses={statuses}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </Card>
    </div>
  )
}
