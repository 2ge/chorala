'use client'

import { useState, useTransition } from 'react'
import { Button, Select, Textarea } from '@/components/ui'
import { approvePost, askFeedbackAction, dismissPost, ingestFeedback } from '@/lib/actions'

export function IngestForm({ projectId }: { projectId: string }) {
  const [text, setText] = useState('')
  const [source, setSource] = useState('intercom')
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!text.trim()) return
        start(async () => {
          const r = await ingestFeedback(projectId, source, text)
          setText('')
          setMsg(
            r.created === 0
              ? 'No feature requests found.'
              : `Captured ${r.created} ${r.created === 1 ? 'request' : 'requests'}${r.aiEnabled ? '' : ' (AI off — captured as-is)'} → review below.`,
          )
        })
      }}
      className="space-y-2"
    >
      <Textarea
        placeholder="Paste a support conversation, email, or Slack thread… Autopilot extracts the feature requests."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
      />
      <div className="flex items-center gap-2">
        <Select className="w-36" value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="intercom">Intercom</option>
          <option value="zendesk">Zendesk</option>
          <option value="slack">Slack</option>
          <option value="email">Email</option>
          <option value="manual">Manual</option>
        </Select>
        <Button type="submit" size="sm" disabled={pending || !text.trim()}>
          {pending ? 'Extracting…' : 'Capture feedback'}
        </Button>
        {msg && <span className="text-xs text-ink-soft">{msg}</span>}
      </div>
    </form>
  )
}

export function AskBox({ projectId }: { projectId: string }) {
  const [q, setQ] = useState('')
  const [res, setRes] = useState<Awaited<ReturnType<typeof askFeedbackAction>> | null>(null)
  const [pending, start] = useTransition()
  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!q.trim()) return
          start(async () => setRes(await askFeedbackAction(projectId, q.trim())))
        }}
        className="flex gap-2"
      >
        <input
          className="grow rounded-[10px] border border-line bg-raised px-3 py-2 text-sm outline-none focus:border-ink-faint"
          placeholder="Ask your feedback — e.g. “What do enterprise users want most?”"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button type="submit" size="sm" disabled={pending || !q.trim()}>
          {pending ? '…' : 'Ask'}
        </Button>
      </form>
      {res && (
        <div className="rounded-xl border border-line bg-paper/60 p-4 text-sm">
          {res.answer ? (
            <p className="leading-relaxed text-ink">{res.answer}</p>
          ) : (
            <p className="text-ink-faint">
              {res.aiEnabled ? 'No answer.' : 'AI is disabled — showing the most related feedback:'}
            </p>
          )}
          {res.sources.length > 0 && (
            <ul className="mt-2 space-y-1">
              {res.sources.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-ink-soft">
                  <span className="tabular-nums text-ink-faint">▲ {s.voteCount}</span>
                  <a
                    className="truncate transition hover:text-accent"
                    href={`/admin/${projectId}/posts/${s.id}`}
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export function ReviewActions({ projectId, postId }: { projectId: string; postId: string }) {
  const [pending, start] = useTransition()
  return (
    <div className="flex shrink-0 gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() => start(() => approvePost(projectId, postId))}
      >
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => start(() => dismissPost(projectId, postId))}
      >
        Dismiss
      </Button>
    </div>
  )
}
