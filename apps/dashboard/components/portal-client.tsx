'use client'

import { type FormEvent, useState } from 'react'
import { subscribeToChangelog } from '@/lib/actions'

export function PortalVote({
  publicKey,
  postId,
  count,
  voted,
}: {
  publicKey: string
  postId: string
  count: number
  voted: boolean
}) {
  const [c, setC] = useState(count)
  const [v, setV] = useState(voted)
  const [busy, setBusy] = useState(false)

  async function toggle() {
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/public/posts/${postId}/vote`, {
        method: v ? 'DELETE' : 'POST',
        credentials: 'include',
        headers: { 'x-heed-key': publicKey },
      })
      if (res.ok) {
        const d = (await res.json()) as { voted: boolean; voteCount: number }
        setC(d.voteCount)
        setV(d.voted)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className="flex h-14 w-12 flex-col items-center justify-center gap-0.5 rounded-xl border text-sm font-bold tabular-nums shadow-[0_1px_0_rgba(28,24,21,0.04)] transition active:translate-y-px"
      style={
        v
          ? { background: 'var(--brand)', borderColor: 'var(--brand)', color: '#fff' }
          : {
              background: 'var(--color-raised)',
              borderColor: 'var(--color-line-strong)',
              color: 'var(--color-ink)',
            }
      }
    >
      <span className="text-[0.65em] leading-none">▲</span>
      {c}
    </button>
  )
}

export function SubscribeForm({ projectId }: { projectId: string }) {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    await subscribeToChangelog(projectId, email.trim())
    setDone(true)
    setEmail('')
  }

  if (done) return <p className="text-sm font-medium text-emerald-600">You’re subscribed. ✓</p>
  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="h-10 grow rounded-[10px] border border-line-strong bg-raised px-3 text-sm outline-none transition placeholder:text-ink-faint focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
      />
      <button
        type="submit"
        className="h-10 rounded-[10px] px-4 text-sm font-semibold text-white transition active:translate-y-px"
        style={{ background: 'var(--brand)' }}
      >
        Subscribe
      </button>
    </form>
  )
}
