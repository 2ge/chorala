'use client'

import { useState, useTransition } from 'react'
import { Button, Input, Select } from '@/components/ui'
import { setAssignee, setPostScoreFields, voteForUser } from '@/lib/actions'

type Member = { id: string; name: string | null; email: string | null }
type Field = { id: string; key: string; label: string; weight: number }

export function AssigneeSelect({
  projectId,
  postId,
  assigneeMemberId,
  members,
}: {
  projectId: string
  postId: string
  assigneeMemberId: string | null
  members: Member[]
}) {
  const [pending, start] = useTransition()
  return (
    <Select
      aria-label="assignee"
      defaultValue={assigneeMemberId ?? ''}
      disabled={pending}
      onChange={(e) => {
        const v = e.target.value || null
        start(() => void setAssignee(projectId, postId, v))
      }}
    >
      <option value="">Unassigned</option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name || m.email || m.id}
        </option>
      ))}
    </Select>
  )
}

/** Per-field numeric inputs with a live weighted total; saves the whole map at once. */
export function ScoreEditor({
  projectId,
  postId,
  fields,
  scoreFields,
}: {
  projectId: string
  postId: string
  fields: Record<string, number>
  scoreFields: Field[]
}) {
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(scoreFields.map((f) => [f.key, String(fields[f.key] ?? '')])),
  )
  const [pending, start] = useTransition()

  const total = scoreFields.reduce((s, f) => {
    const n = Number.parseFloat(vals[f.key] ?? '')
    return s + (Number.isFinite(n) ? n * f.weight : 0)
  }, 0)

  function save() {
    const map: Record<string, number> = {}
    for (const f of scoreFields) {
      const n = Number.parseFloat(vals[f.key] ?? '')
      if (Number.isFinite(n)) map[f.key] = n
    }
    start(() => void setPostScoreFields(projectId, postId, map))
  }

  return (
    <div className="space-y-2.5">
      {scoreFields.map((f) => (
        <label key={f.id} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-ink-soft">
            {f.label}
            <span className="ml-1 text-[11px] text-ink-faint">×{f.weight}</span>
          </span>
          <Input
            type="number"
            step="any"
            className="w-20 text-right"
            value={vals[f.key] ?? ''}
            onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
          />
        </label>
      ))}
      <div className="flex items-center justify-between border-t border-line pt-2.5">
        <span className="text-sm font-semibold">Score</span>
        <span className="text-sm font-bold tabular-nums text-accent">
          {Math.round(total * 100) / 100}
        </span>
      </div>
      <Button size="sm" className="w-full" disabled={pending} onClick={save}>
        {pending ? 'Saving…' : 'Save score'}
      </Button>
    </div>
  )
}

export function VoteForForm({ projectId, postId }: { projectId: string; postId: string }) {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [pending, start] = useTransition()
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!email.trim()) return
        start(async () => {
          await voteForUser(projectId, postId, email.trim())
          setEmail('')
          setDone(true)
        })
      }}
    >
      <Input
        type="email"
        placeholder="customer@email.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          setDone(false)
        }}
      />
      <Button size="sm" type="submit" disabled={pending || !email.trim()}>
        {pending ? '…' : done ? '✓' : 'Vote'}
      </Button>
    </form>
  )
}
