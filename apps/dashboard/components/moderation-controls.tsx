'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui'
import { moderateComment, moderatePost } from '@/lib/actions'

type Kind = 'post' | 'comment'
type Action = 'hide' | 'unhide' | 'approve'

export function ModerationActions({
  projectId,
  kind,
  id,
  hidden,
}: {
  projectId: string
  kind: Kind
  id: string
  hidden: boolean
}) {
  const [pending, start] = useTransition()
  const run = (action: Action) =>
    start(() =>
      kind === 'post'
        ? moderatePost(projectId, id, action)
        : moderateComment(projectId, id, action),
    )

  return (
    <div className="flex shrink-0 gap-2">
      {hidden ? (
        <Button size="sm" disabled={pending} onClick={() => run('unhide')}>
          Restore
        </Button>
      ) : (
        <>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run('approve')}>
            Approve
          </Button>
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run('hide')}
            className="bg-red-500 hover:bg-red-600"
          >
            Hide
          </Button>
        </>
      )}
    </div>
  )
}
