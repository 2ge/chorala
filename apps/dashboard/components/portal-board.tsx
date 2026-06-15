'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useMemo, useState } from 'react'
import { PortalVote } from '@/components/portal-client'

type Board = { id: string; slug: string; name: string; description: string | null; kind: string }
type Status = { name: string; color: string; kind: string } | null
type Tag = { name: string; color: string }
type Post = {
  id: string
  boardId: string
  title: string
  body: string
  voteCount: number
  commentCount: number
  hasVoted?: boolean
  createdAt: string
  status?: Status
  tags?: Tag[]
}

const KIND_BLURB: Record<string, string> = {
  feature: 'Suggest something you’d love to see, and vote on others’ ideas.',
  bug: 'Report something that’s broken — the more votes, the faster we look.',
  general: 'Tell us what’s on your mind.',
}

export function PortalBoard({
  publicKey,
  boards,
  posts,
  basePath,
}: {
  publicKey: string
  boards: Board[]
  posts: Post[]
  basePath: string
}) {
  const router = useRouter()
  const [boardId, setBoardId] = useState<string | null>(null)
  const [sort, setSort] = useState<'top' | 'new'>('top')
  const [showForm, setShowForm] = useState(false)

  const activeBoard = boards.find((b) => b.id === boardId) ?? null
  const visible = useMemo(() => {
    const list = boardId ? posts.filter((p) => p.boardId === boardId) : posts
    return [...list].sort((a, b) =>
      sort === 'new' ? +new Date(b.createdAt) - +new Date(a.createdAt) : b.voteCount - a.voteCount,
    )
  }, [posts, boardId, sort])

  return (
    <div>
      {/* Board filter */}
      {boards.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Chip active={!boardId} onClick={() => setBoardId(null)}>
            All
          </Chip>
          {boards.map((b) => (
            <Chip key={b.id} active={boardId === b.id} onClick={() => setBoardId(b.id)}>
              {b.name}
            </Chip>
          ))}
        </div>
      )}

      <p className="mb-4 text-sm text-ink-soft">
        {activeBoard?.description || KIND_BLURB[activeBoard?.kind ?? 'feature']}
      </p>

      {/* Submit + sort */}
      <div className="mb-5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="rounded-[10px] px-4 py-2 text-sm font-semibold text-white shadow-sm transition active:translate-y-px"
          style={{ background: 'var(--brand)' }}
        >
          {showForm ? 'Close' : '+ Suggest an idea'}
        </button>
        <div className="ml-auto flex rounded-full border border-line bg-raised p-0.5 text-xs font-semibold">
          {(['top', 'new'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              className="rounded-full px-2.5 py-1 capitalize transition"
              style={
                sort === s
                  ? { background: 'var(--brand)', color: '#fff' }
                  : { color: 'var(--color-ink-soft)' }
              }
            >
              {s === 'top' ? 'Top' : 'New'}
            </button>
          ))}
        </div>
      </div>

      {showForm && (
        <SubmitForm
          publicKey={publicKey}
          boards={boards}
          defaultBoardId={boardId}
          onDone={() => {
            setShowForm(false)
            router.refresh()
          }}
        />
      )}

      <div className="space-y-2.5">
        {visible.length === 0 && (
          <div className="surface p-8 text-center">
            <p className="font-medium">Nothing here yet.</p>
            <p className="mt-1 text-sm text-ink-soft">Be the first — suggest an idea above.</p>
          </div>
        )}
        {visible.map((p) => (
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
            <a href={`${basePath}posts/${p.id}`} className="block min-w-0 grow pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium tracking-[-0.01em]">{p.title}</p>
                {p.status && <StatusPill status={p.status} />}
                {p.tags?.map((t) => (
                  <TagChip key={t.name} tag={t} />
                ))}
              </div>
              {p.body && <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{p.body}</p>}
              <p className="mt-1.5 text-xs text-ink-faint">
                {p.commentCount} {p.commentCount === 1 ? 'comment' : 'comments'}
              </p>
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-3 py-1.5 text-sm font-medium transition"
      style={
        active
          ? { background: 'var(--brand)', borderColor: 'var(--brand)', color: '#fff' }
          : { borderColor: 'var(--color-line-strong)', color: 'var(--color-ink-soft)' }
      }
    >
      {children}
    </button>
  )
}

export function TagChip({ tag }: { tag: { name: string; color: string } }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ background: `${tag.color}1a`, color: tag.color }}
    >
      {tag.name}
    </span>
  )
}

export function StatusPill({ status }: { status: { name: string; color: string } }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: `${status.color}1a`, color: status.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.color }} />
      {status.name}
    </span>
  )
}

function SubmitForm({
  publicKey,
  boards,
  defaultBoardId,
  onDone,
}: {
  publicKey: string
  boards: Board[]
  defaultBoardId: string | null
  onDone: () => void
}) {
  const [boardSlug, setBoardSlug] = useState(
    boards.find((b) => b.id === defaultBoardId)?.slug ?? boards[0]?.slug ?? '',
  )
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (title.trim().length < 2) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/v1/public/posts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-chorala-key': publicKey, 'content-type': 'application/json' },
        body: JSON.stringify({ boardSlug, title: title.trim(), body: body.trim() }),
      })
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
        throw new Error(d?.error?.message ?? 'Could not submit. Please try again.')
      }
      onDone()
    } catch (e2) {
      setErr((e2 as Error).message)
      setBusy(false)
    }
  }

  const field =
    'w-full rounded-[10px] border border-line-strong bg-raised px-3 py-2.5 text-sm outline-none transition placeholder:text-ink-faint focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20'

  return (
    <form onSubmit={submit} className="surface mb-5 space-y-3 p-4">
      {boards.length > 1 && (
        <select className={field} value={boardSlug} onChange={(e) => setBoardSlug(e.target.value)}>
          {boards.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>
      )}
      <input
        className={field}
        value={title}
        placeholder="A short, clear title"
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className={`${field} min-h-24 resize-y`}
        value={body}
        placeholder="Add any detail that helps us understand it (optional)"
        onChange={(e) => setBody(e.target.value)}
      />
      {err && <p className="text-sm text-red-500">{err}</p>}
      <button
        type="submit"
        disabled={busy || title.trim().length < 2}
        className="rounded-[10px] px-4 py-2 text-sm font-semibold text-white transition active:translate-y-px disabled:opacity-60"
        style={{ background: 'var(--brand)' }}
      >
        {busy ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  )
}
