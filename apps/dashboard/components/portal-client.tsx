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
      className={`flex w-12 shrink-0 flex-col items-center rounded-lg border py-1 text-sm font-bold transition ${
        v
          ? 'border-transparent bg-[var(--brand)] text-white'
          : 'border-slate-200 hover:border-[var(--brand)]'
      }`}
    >
      <span className="text-xs">▲</span>
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

  if (done) return <p className="text-sm text-green-600">You’re subscribed. ✓</p>
  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="h-9 grow rounded-lg border border-slate-300 px-3 text-sm"
      />
      <button
        type="submit"
        className="h-9 rounded-lg bg-[var(--brand)] px-4 text-sm font-semibold text-white"
      >
        Subscribe
      </button>
    </form>
  )
}
