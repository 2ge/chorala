import { apiKeys as keySvc } from '@chorala/core'
import { KeyCreator } from '@/components/key-creator'
import { Badge, Card } from '@/components/ui'
import { requireAuthContext } from '@/lib/session'

export default async function KeysPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const ctx = await requireAuthContext()
  const keys = await keySvc.listApiKeys(ctx, projectId)

  return (
    <div className="mx-auto max-w-xl space-y-5 p-6">
      <h1 className="font-display text-2xl tracking-[-0.01em]">API keys</h1>

      <Card className="space-y-2 p-5 text-sm text-ink-soft">
        <p>
          An <code className="rounded bg-ink/[0.06] px-1">hk_…</code> key is a{' '}
          <strong className="text-ink">secret admin key</strong>. Send it as{' '}
          <code className="rounded bg-ink/[0.06] px-1">Authorization: Bearer hk_…</code> to the
          management API to read and write <em>this project</em> — boards, posts, statuses,
          changelog, tags, comments. Use it for server-to-server automation, scripts, or to connect
          the <strong className="text-ink">MCP server</strong> so you can triage feedback from
          Claude / Cursor.
        </p>
        <p className="text-ink-faint">
          Not to be confused with the <strong className="text-ink-soft">public key</strong> (
          <code>pk_…</code>, on the Settings page) — that one is publishable and only touches the
          public widget surface. An <code>hk_…</code> key is powerful and{' '}
          <strong className="text-ink-soft">must stay secret</strong>. The full key is shown{' '}
          <strong className="text-ink-soft">once</strong>, at creation — copy it then; we only store
          a hash.
        </p>
      </Card>

      <Card className="p-5">
        <KeyCreator projectId={projectId} />
      </Card>

      <Card className="divide-y divide-line">
        {keys.length === 0 && <p className="p-5 text-sm text-ink-faint">No keys yet.</p>}
        {keys.map((k) => (
          <div key={k.id} className="flex items-center gap-3 p-3 text-sm">
            <span className="grow font-medium">{k.name}</span>
            <code className="text-xs text-ink-faint">{k.prefix}…</code>
            <Badge className="bg-ink/[0.06] text-ink-soft">{k.scopes.join(', ')}</Badge>
          </div>
        ))}
      </Card>
    </div>
  )
}
