'use client'

import { type FormEvent, useState, useTransition } from 'react'
import { Badge, Button, Select, Textarea } from '@/components/ui'
import { addComment, mergePost, setPostTags } from '@/lib/actions'

type Tag = { id: string; name: string; color: string }

export function CommentForm({ projectId, postId }: { projectId: string; postId: string }) {
  const [body, setBody] = useState('')
  const [internal, setInternal] = useState(false)
  const [pending, start] = useTransition()

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    start(async () => {
      await addComment(projectId, postId, body.trim(), internal)
      setBody('')
    })
  }
  return (
    <form onSubmit={submit} className="space-y-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={internal ? 'Internal note (staff only)…' : 'Reply publicly…'}
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={internal}
            onChange={(e) => setInternal(e.target.checked)}
          />
          Internal note
        </label>
        <Button type="submit" size="sm" disabled={pending || !body.trim()}>
          {pending ? 'Saving…' : 'Comment'}
        </Button>
      </div>
    </form>
  )
}

export function TagEditor({
  projectId,
  postId,
  allTags,
  current,
}: {
  projectId: string
  postId: string
  allTags: Tag[]
  current: string[]
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(current))
  const [pending, start] = useTransition()

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
    start(() => setPostTags(projectId, postId, [...next]))
  }

  if (allTags.length === 0) return <p className="text-xs text-slate-400">No tags defined yet.</p>
  return (
    <div className="flex flex-wrap gap-1.5">
      {allTags.map((t) => {
        const on = selected.has(t.id)
        return (
          <button
            key={t.id}
            type="button"
            disabled={pending}
            onClick={() => toggle(t.id)}
            className="cursor-pointer"
          >
            <Badge
              color={on ? t.color : undefined}
              className={on ? '' : 'bg-slate-100 text-slate-500'}
            >
              {on ? '✓ ' : ''}
              {t.name}
            </Badge>
          </button>
        )
      })}
    </div>
  )
}

export function MergeControl({
  projectId,
  postId,
  candidates,
}: {
  projectId: string
  postId: string
  candidates: { id: string; title: string }[]
}) {
  const [target, setTarget] = useState('')
  const [pending, start] = useTransition()
  return (
    <div className="flex items-center gap-2">
      <Select value={target} onChange={(e) => setTarget(e.target.value)} className="grow">
        <option value="">Merge into…</option>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </Select>
      <Button
        size="sm"
        variant="secondary"
        disabled={!target || pending}
        onClick={() => target && start(() => mergePost(projectId, postId, target))}
      >
        Merge
      </Button>
    </div>
  )
}
