'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui'
import { createGithubIssue } from '@/lib/actions'

type Issue = { number: number; url: string }

export function GithubIssueButton({
  projectId,
  postId,
  connected,
  issue,
}: {
  projectId: string
  postId: string
  connected: boolean
  issue: Issue | null
}) {
  const [pending, start] = useTransition()
  const [link, setLink] = useState<Issue | null>(issue)
  const [err, setErr] = useState<string | null>(null)

  if (link) {
    return (
      <a
        href={link.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
      >
        Issue #{link.number}
        <span aria-hidden>↗</span>
      </a>
    )
  }
  if (!connected) {
    return <p className="text-xs text-ink-faint">Connect GitHub in Settings to create issues.</p>
  }
  return (
    <div className="space-y-1.5">
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setErr(null)
            try {
              setLink(await createGithubIssue(projectId, postId))
            } catch (e) {
              setErr((e as Error).message)
            }
          })
        }
      >
        {pending ? 'Creating…' : 'Create GitHub issue'}
      </Button>
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  )
}
