'use client'

import { useState, useTransition } from 'react'
import { Button, Input } from '@/components/ui'
import { createScoreField, deleteScoreField } from '@/lib/actions'

type Field = { id: string; key: string; label: string; weight: number }

export function ScoreFieldsManager({ projectId, fields }: { projectId: string; fields: Field[] }) {
  const [label, setLabel] = useState('')
  const [weight, setWeight] = useState('1')
  const [err, setErr] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function add(e: React.FormEvent) {
    e.preventDefault()
    const key = label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
    if (!key) return
    const w = Number.parseFloat(weight)
    setErr(null)
    start(async () => {
      try {
        await createScoreField(projectId, {
          key,
          label: label.trim(),
          weight: Number.isFinite(w) ? w : 1,
        })
        setLabel('')
        setWeight('1')
      } catch (e2) {
        setErr((e2 as Error).message)
      }
    })
  }

  return (
    <div className="space-y-3">
      {fields.length > 0 && (
        <ul className="divide-y divide-line/70 rounded-xl border border-line">
          {fields.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="font-medium">{f.label}</span>
              <code className="text-[11px] text-ink-faint">{f.key}</code>
              <span className="ml-auto tabular-nums text-ink-soft">weight ×{f.weight}</span>
              <button
                type="button"
                className="text-ink-faint transition hover:text-red-500"
                onClick={() => start(() => void deleteScoreField(projectId, f.id))}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="flex flex-wrap items-end gap-2">
        <div className="grow">
          <Input
            placeholder="Field name (e.g. Reach, Impact, Effort)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <Input
          type="number"
          step="any"
          className="w-24"
          aria-label="weight"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
        <Button type="submit" size="sm" disabled={pending || !label.trim()}>
          Add field
        </Button>
      </form>
      <p className="text-xs text-ink-faint">
        Score = Σ (value × weight). Give cost-like inputs a negative weight (e.g. Effort = −1) to
        model RICE/ICE.
      </p>
      {err && <p className="text-xs text-red-500">{err}</p>}
    </div>
  )
}
