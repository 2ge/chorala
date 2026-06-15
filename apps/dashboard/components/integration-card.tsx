'use client'

import { useTransition } from 'react'
import { Button, Input, Label } from '@/components/ui'
import { connectGithub, disconnectGithub } from '@/lib/actions'

export function GithubIntegrationCard({ projectId, repo }: { projectId: string; repo?: string }) {
  const [pending, start] = useTransition()
  const connected = !!repo

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <title>GitHub</title>
          <path d="M12 2a10 10 0 00-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.1-1.47-1.1-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 015 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0012 2z" />
        </svg>
        <span className="font-semibold">GitHub</span>
        {connected && (
          <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">
            connected · {repo}
          </span>
        )}
      </div>
      <p className="text-sm text-ink-soft">
        Turn feedback into issues. Creating an issue is one click on a post; status changes comment
        on and close/reopen the linked issue automatically.
      </p>

      <form action={connectGithub} className="space-y-3">
        <input type="hidden" name="projectId" value={projectId} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label>Repository</Label>
            <Input name="repo" placeholder="owner/repo" defaultValue={repo} required />
            <p className="mt-1 text-xs leading-relaxed text-ink-faint">
              Format <code>owner/repo</code> — <strong className="text-ink-soft">owner</strong> is
              your GitHub username or organization, <strong className="text-ink-soft">repo</strong>{' '}
              the repository name (e.g. <code>2ge/chorala</code>). It must already exist and the
              token must have access to it.
            </p>
          </div>
          <div>
            <Label>{connected ? 'Token (leave blank to keep)' : 'Personal access token'}</Label>
            <Input
              name="token"
              type="password"
              placeholder="ghp_… (repo scope)"
              required={!connected}
            />
            <p className="mt-1 text-xs leading-relaxed text-ink-faint">
              A classic PAT with the <code>repo</code> scope.{' '}
              <a
                href="https://github.com/settings/tokens/new?scopes=repo&description=Chorala"
                target="_blank"
                rel="noreferrer"
                className="text-accent underline-offset-2 hover:underline"
              >
                Create one →
              </a>{' '}
              Stored encrypted at rest.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit">{connected ? 'Update' : 'Connect'}</Button>
          {connected && (
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => start(() => disconnectGithub(projectId))}
            >
              Disconnect
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
