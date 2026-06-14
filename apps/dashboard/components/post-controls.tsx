'use client'

import { useTransition } from 'react'
import { Button, Select } from '@/components/ui'
import { changePostStatus, togglePin } from '@/lib/actions'

type StatusOpt = { id: string; name: string }

export function StatusSelect({
  projectId,
  postId,
  statusId,
  statuses,
}: {
  projectId: string
  postId: string
  statusId: string | null
  statuses: StatusOpt[]
}) {
  const [pending, start] = useTransition()
  return (
    <Select
      aria-label="status"
      defaultValue={statusId ?? ''}
      disabled={pending}
      onChange={(e) => {
        const v = e.target.value || null
        start(() => {
          void changePostStatus(projectId, postId, v)
        })
      }}
    >
      <option value="">No status</option>
      {statuses.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </Select>
  )
}

export function PinButton({
  projectId,
  postId,
  pinned,
}: {
  projectId: string
  postId: string
  pinned: boolean
}) {
  const [pending, start] = useTransition()
  return (
    <Button
      variant={pinned ? 'default' : 'outline'}
      size="sm"
      disabled={pending}
      onClick={() => start(() => void togglePin(projectId, postId, !pinned))}
    >
      {pinned ? '📌 Pinned' : 'Pin'}
    </Button>
  )
}
