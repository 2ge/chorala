'use client'

import { useState, useTransition } from 'react'
import { Button, Input } from '@/components/ui'
import { connectDiscord, connectSegment, disconnectIntegration } from '@/lib/actions'

export function DiscordCard({ projectId, connected }: { projectId: string; connected: boolean }) {
  const [url, setUrl] = useState('')
  const [pending, start] = useTransition()
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Discord</h2>
        {connected && <span className="text-xs font-medium text-emerald-600">Connected</span>}
      </div>
      <p className="text-xs text-ink-faint">
        Post new feedback and shipped changelog entries to a Discord channel. Paste an{' '}
        <a
          className="text-accent hover:underline"
          href="https://support.discord.com/hc/en-us/articles/228383668"
          target="_blank"
          rel="noreferrer"
        >
          incoming webhook URL
        </a>
        .
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="https://discord.com/api/webhooks/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button
          size="sm"
          disabled={pending || !url.trim()}
          onClick={() => start(() => connectDiscord(projectId, url).then(() => setUrl('')))}
        >
          {connected ? 'Update' : 'Connect'}
        </Button>
        {connected && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => start(() => disconnectIntegration(projectId, 'discord'))}
          >
            Remove
          </Button>
        )}
      </div>
    </div>
  )
}

export function SegmentCard({ projectId, connected }: { projectId: string; connected: boolean }) {
  const [creds, setCreds] = useState<{ secret: string; url: string } | null>(null)
  const [pending, start] = useTransition()
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Inbound webhook (Segment-compatible)</h2>
        {connected && <span className="text-xs font-medium text-emerald-600">Enabled</span>}
      </div>
      <p className="text-xs text-ink-faint">
        Receive <code>identify</code> / <code>group</code> events to auto-populate end-users and
        companies (powers revenue weighting + segments) — no per-user JWT wiring. Point Segment (or
        any source) at the URL below with the secret as a <code>Bearer</code> token.
      </p>
      {creds && (
        <div className="space-y-1 rounded-lg border border-accent/30 bg-accent-soft p-3 text-xs">
          <p className="font-semibold text-accent">Save this secret now — it’s shown once.</p>
          <p>
            URL: <code className="break-all">{creds.url}</code>
          </p>
          <p>
            Secret: <code className="break-all">{creds.secret}</code>
          </p>
        </div>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() => start(async () => setCreds(await connectSegment(projectId)))}
        >
          {connected ? 'Regenerate secret' : 'Enable'}
        </Button>
        {connected && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => start(() => disconnectIntegration(projectId, 'segment'))}
          >
            Disable
          </Button>
        )}
      </div>
    </div>
  )
}
