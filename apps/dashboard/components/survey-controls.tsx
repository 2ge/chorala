'use client'

import { useState, useTransition } from 'react'
import { Button, Input, Select } from '@/components/ui'
import { createSurvey, deleteSurvey, toggleSurvey } from '@/lib/actions'

type SurveyType = 'nps' | 'csat' | 'ces' | 'rating' | 'text' | 'choice'
const TYPES: { v: SurveyType; label: string; q: string }[] = [
  { v: 'nps', label: 'NPS', q: 'How likely are you to recommend us to a friend?' },
  { v: 'csat', label: 'CSAT', q: 'How satisfied are you with the product?' },
  { v: 'ces', label: 'CES', q: 'How easy was it to get what you needed?' },
  { v: 'rating', label: 'Star rating', q: 'How would you rate your experience?' },
  { v: 'text', label: 'Open text', q: 'What’s the one thing we could do better?' },
  { v: 'choice', label: 'Multiple choice', q: 'Which best describes you?' },
]
const DEFAULT_SCALE: Record<SurveyType, [number, number]> = {
  nps: [0, 10],
  csat: [1, 5],
  ces: [1, 7],
  rating: [1, 5],
  text: [0, 0],
  choice: [0, 0],
}

export function SurveyBuilder({
  projectId,
  segments,
}: {
  projectId: string
  segments: { id: string; name: string }[]
}) {
  const [type, setType] = useState<SurveyType>('nps')
  const [name, setName] = useState('')
  const [question, setQuestion] = useState(TYPES[0]?.q ?? '')
  const [options, setOptions] = useState('')
  const [segmentId, setSegmentId] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function pickType(t: SurveyType) {
    setType(t)
    setQuestion(TYPES.find((x) => x.v === t)?.q ?? question)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !question.trim()) return
    const [scaleMin, scaleMax] = DEFAULT_SCALE[type]
    setErr(null)
    start(async () => {
      try {
        await createSurvey(projectId, {
          name: name.trim(),
          type,
          question: question.trim(),
          config: {
            scaleMin,
            scaleMax,
            options:
              type === 'choice'
                ? options
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                : undefined,
          },
          segmentId: segmentId || null,
          isActive: true,
        })
        setName('')
      } catch (e2) {
        setErr((e2 as Error).message)
      }
    })
  }

  const field =
    'w-full rounded-[10px] border border-line bg-raised px-3 py-2.5 text-sm outline-none focus:border-ink-faint'

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t.v}
            type="button"
            onClick={() => pickType(t.v)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              type === t.v
                ? 'border-accent bg-accent text-white'
                : 'border-line text-ink-soft hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Input
        placeholder="Internal name (e.g. Q3 NPS)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <textarea
        className={`${field} min-h-16 resize-y`}
        placeholder="Question shown to users"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      {type === 'choice' && (
        <Input
          placeholder="Options, comma-separated"
          value={options}
          onChange={(e) => setOptions(e.target.value)}
        />
      )}
      <div className="flex items-center gap-2">
        <Select value={segmentId} onChange={(e) => setSegmentId(e.target.value)} className="grow">
          <option value="">Everyone</option>
          {segments.map((s) => (
            <option key={s.id} value={s.id}>
              Only: {s.name}
            </option>
          ))}
        </Select>
        <Button type="submit" size="sm" disabled={pending || !name.trim()}>
          {pending ? 'Creating…' : 'Create & publish'}
        </Button>
      </div>
      {err && <p className="text-sm text-red-500">{err}</p>}
    </form>
  )
}

export function SurveyRowActions({
  projectId,
  id,
  isActive,
}: {
  projectId: string
  id: string
  isActive: boolean
}) {
  const [pending, start] = useTransition()
  return (
    <div className="flex shrink-0 gap-2">
      <Button
        size="sm"
        variant={isActive ? 'default' : 'outline'}
        disabled={pending}
        onClick={() => start(() => toggleSurvey(projectId, id, !isActive))}
      >
        {isActive ? 'Live' : 'Paused'}
      </Button>
      <button
        type="button"
        disabled={pending}
        className="text-ink-faint transition hover:text-red-500"
        onClick={() => start(() => deleteSurvey(projectId, id))}
      >
        ✕
      </button>
    </div>
  )
}
