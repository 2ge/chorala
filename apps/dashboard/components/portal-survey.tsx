'use client'

import { useEffect, useState } from 'react'

type Survey = {
  id: string
  type: 'nps' | 'csat' | 'ces' | 'rating' | 'text' | 'choice'
  question: string
  config: {
    scaleMin?: number
    scaleMax?: number
    lowLabel?: string
    highLabel?: string
    options?: string[]
  }
}

/** A dismissable in-portal survey prompt: fetches the active survey and submits one response. */
export function PortalSurvey({ publicKey }: { publicKey: string }) {
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [text, setText] = useState('')
  const [done, setDone] = useState(false)
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    fetch('/api/v1/public/survey', {
      credentials: 'include',
      headers: { 'x-chorala-key': publicKey },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => setSurvey(s))
      .catch(() => {})
  }, [publicKey])

  if (!survey || closed) return null

  async function submit(body: { value?: number; text?: string; choice?: string }) {
    if (!survey) return
    await fetch(`/api/v1/public/survey/${survey.id}/responses`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'x-chorala-key': publicKey, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {})
    setDone(true)
  }

  const { scaleMin = 0, scaleMax = 10, lowLabel, highLabel, options } = survey.config
  const scale = Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i)

  return (
    <div className="mb-5 rounded-2xl border border-[var(--brand)]/30 bg-[var(--brand)]/[0.06] p-4">
      <div className="flex items-start gap-3">
        <p className="grow text-sm font-medium text-ink">
          {done ? 'Thanks for the feedback! 🙏' : survey.question}
        </p>
        <button
          type="button"
          onClick={() => setClosed(true)}
          aria-label="Dismiss"
          className="text-ink-faint transition hover:text-ink"
        >
          ✕
        </button>
      </div>

      {!done && (
        <div className="mt-3">
          {(survey.type === 'nps' ||
            survey.type === 'csat' ||
            survey.type === 'ces' ||
            survey.type === 'rating') && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {scale.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => submit({ value: n })}
                    className="h-9 min-w-9 rounded-lg border border-line-strong bg-raised px-2.5 text-sm font-semibold tabular-nums text-ink transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
                  >
                    {survey.type === 'rating' ? '★' : n}
                  </button>
                ))}
              </div>
              {(lowLabel || highLabel) && (
                <div className="mt-1.5 flex justify-between text-[11px] text-ink-faint">
                  <span>{lowLabel}</span>
                  <span>{highLabel}</span>
                </div>
              )}
            </>
          )}

          {survey.type === 'choice' && (
            <div className="flex flex-wrap gap-2">
              {(options ?? []).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => submit({ choice: o })}
                  className="rounded-full border border-line-strong bg-raised px-3 py-1.5 text-sm text-ink transition hover:border-[var(--brand)]"
                >
                  {o}
                </button>
              ))}
            </div>
          )}

          {survey.type === 'text' && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (text.trim()) submit({ text: text.trim() })
              }}
              className="flex gap-2"
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your answer…"
                className="grow rounded-[10px] border border-line-strong bg-raised px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
              />
              <button
                type="submit"
                disabled={!text.trim()}
                className="rounded-[10px] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: 'var(--brand)' }}
              >
                Send
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
