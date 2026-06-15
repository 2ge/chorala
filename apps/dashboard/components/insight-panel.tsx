'use client'

import { useState, useTransition } from 'react'
import { Button, Input, Select } from '@/components/ui'
import { addInsight, removeInsight } from '@/lib/actions'

type Insight = {
  id: string
  quote: string
  source: string
  customerEmail: string | null
  companyName?: string | null
  companyMrr?: number | null
  createdAt: string | Date
}

const SOURCES = ['manual', 'intercom', 'zendesk', 'email', 'sales', 'call', 'other'] as const

export function InsightPanel({
  projectId,
  postId,
  insights,
}: {
  projectId: string
  postId: string
  insights: Insight[]
}) {
  const [quote, setQuote] = useState('')
  const [source, setSource] = useState<(typeof SOURCES)[number]>('manual')
  const [email, setEmail] = useState('')
  const [pending, start] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!quote.trim()) return
    start(async () => {
      await addInsight(projectId, {
        postId,
        quote: quote.trim(),
        source,
        customerEmail: email.trim() || undefined,
      })
      setQuote('')
      setEmail('')
    })
  }

  const field =
    'w-full rounded-[10px] border border-line bg-raised px-3 py-2.5 text-sm outline-none focus:border-ink-faint'

  return (
    <div className="space-y-3">
      {insights.length > 0 && (
        <ul className="space-y-2">
          {insights.map((it) => (
            <li key={it.id} className="rounded-xl border border-line bg-paper/60 p-3">
              <p className="text-sm text-ink">“{it.quote}”</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-ink-faint">
                <span className="rounded bg-ink/[0.06] px-1.5 py-0.5 font-medium uppercase tracking-wide">
                  {it.source}
                </span>
                {it.customerEmail && <span>{it.customerEmail}</span>}
                {it.companyName && (
                  <span className="text-accent">
                    {it.companyName}
                    {it.companyMrr ? ` · $${it.companyMrr.toLocaleString()}/mo` : ''}
                  </span>
                )}
                <button
                  type="button"
                  className="ml-auto text-ink-faint transition hover:text-red-500"
                  onClick={() => start(() => removeInsight(projectId, postId, it.id))}
                  disabled={pending}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="space-y-2">
        <textarea
          className={`${field} min-h-16 resize-y`}
          placeholder="Paste a customer quote — what did they say, in their words?"
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={source}
            onChange={(e) => setSource(e.target.value as (typeof SOURCES)[number])}
            className="w-32"
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Input
            placeholder="customer@email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="grow"
          />
          <Button type="submit" size="sm" disabled={pending || !quote.trim()}>
            {pending ? 'Saving…' : 'Add evidence'}
          </Button>
        </div>
      </form>
    </div>
  )
}
