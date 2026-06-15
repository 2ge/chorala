'use client'

import { useEffect, useState, useTransition } from 'react'
import { Button, Input, Select } from '@/components/ui'
import { createSegment, deleteSegment, previewSegment } from '@/lib/actions'

export function DeleteSegmentButton({ projectId, id }: { projectId: string; id: string }) {
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      className="text-ink-faint transition hover:text-red-500"
      onClick={() => start(() => void deleteSegment(projectId, id))}
    >
      ✕
    </button>
  )
}

type Field = 'plan' | 'mrr' | 'locale' | 'email_domain' | 'has_company'
type Op = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
type Rule = { field: Field; op: Op; value: string }

const FIELDS: { v: Field; label: string }[] = [
  { v: 'plan', label: 'Company plan' },
  { v: 'mrr', label: 'Company MRR' },
  { v: 'locale', label: 'Locale' },
  { v: 'email_domain', label: 'Email domain' },
  { v: 'has_company', label: 'Has a company' },
]
const OPS: { v: Op; label: string }[] = [
  { v: 'eq', label: '=' },
  { v: 'neq', label: '≠' },
  { v: 'gte', label: '≥' },
  { v: 'lte', label: '≤' },
  { v: 'gt', label: '>' },
  { v: 'lt', label: '<' },
]

export function SegmentBuilder({ projectId }: { projectId: string }) {
  const [name, setName] = useState('')
  const [match, setMatch] = useState<'all' | 'any'>('all')
  const [rules, setRules] = useState<Rule[]>([{ field: 'plan', op: 'eq', value: '' }])
  const [count, setCount] = useState<number | null>(null)
  const [saving, startSave] = useTransition()

  const definition = { match, rules }

  // Debounced live preview of how many users currently match.
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const r = await previewSegment(projectId, { match, rules })
        setCount(r.matchCount)
      } catch {
        setCount(null)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [projectId, match, rules])

  const setRule = (i: number, patch: Partial<Rule>) =>
    setRules((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Segment name (e.g. Paying customers)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Select value={match} onChange={(e) => setMatch(e.target.value as 'all' | 'any')}>
          <option value="all">Match all</option>
          <option value="any">Match any</option>
        </Select>
      </div>

      <div className="space-y-2">
        {rules.map((r, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional + editable
          <div key={i} className="flex flex-wrap items-center gap-2">
            <Select
              className="w-40"
              value={r.field}
              onChange={(e) => setRule(i, { field: e.target.value as Field })}
            >
              {FIELDS.map((f) => (
                <option key={f.v} value={f.v}>
                  {f.label}
                </option>
              ))}
            </Select>
            <Select
              className="w-16"
              value={r.op}
              onChange={(e) => setRule(i, { op: e.target.value as Op })}
            >
              {OPS.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Input
              className="w-32"
              placeholder={r.field === 'has_company' ? 'true / false' : 'value'}
              value={r.value}
              onChange={(e) => setRule(i, { value: e.target.value })}
            />
            <button
              type="button"
              className="text-ink-faint transition hover:text-red-500"
              onClick={() => setRules((rs) => rs.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-xs font-semibold text-accent transition hover:underline"
          onClick={() => setRules((rs) => [...rs, { field: 'plan', op: 'eq', value: '' }])}
        >
          + Add rule
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-line pt-3">
        <span className="text-sm text-ink-soft">
          {count == null ? '—' : <strong className="text-accent">{count}</strong>} end-users match
        </span>
        <Button
          size="sm"
          disabled={saving || !name.trim()}
          onClick={() => startSave(() => void createSegment(projectId, name.trim(), definition))}
        >
          {saving ? 'Saving…' : 'Save segment'}
        </Button>
      </div>
    </div>
  )
}
