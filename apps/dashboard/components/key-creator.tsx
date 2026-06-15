'use client'

import { type FormEvent, useState } from 'react'
import { Button, Input } from '@/components/ui'
import { createApiKey } from '@/lib/actions'

export function KeyCreator({ projectId }: { projectId: string }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    const fd = new FormData()
    fd.set('projectId', projectId)
    fd.set('name', name.trim())
    const key = await createApiKey(fd)
    setCreated(key)
    setName('')
    setBusy(false)
  }

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="flex items-end gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name (e.g. CI, MCP server)"
        />
        <Button type="submit" disabled={busy}>
          Create key
        </Button>
      </form>
      {created && (
        <div className="rounded-lg border border-accent/25 bg-accent-soft p-3 text-sm">
          <p className="mb-1 font-semibold text-accent">
            Copy this key now — it won’t be shown again:
          </p>
          <code className="block break-all rounded bg-ink/[0.06] p-2 text-xs">{created}</code>
        </div>
      )}
    </div>
  )
}
