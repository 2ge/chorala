import { apiKeys as keySvc } from '@chorala/core'
import { KeyCreator } from '@/components/key-creator'
import { Badge, Card } from '@/components/ui'
import { requireAuthContext } from '@/lib/session'

export default async function KeysPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const ctx = await requireAuthContext()
  const keys = await keySvc.listApiKeys(ctx, projectId)

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-xl font-bold">API keys</h1>
      <p className="text-sm text-slate-500">
        Use an <code className="rounded bg-slate-100 px-1">hk_…</code> key as a Bearer token for the
        admin API, or to connect the MCP server (Phase 7).
      </p>
      <Card className="p-5">
        <KeyCreator projectId={projectId} />
      </Card>
      <Card className="divide-y divide-slate-100">
        {keys.length === 0 && <p className="p-5 text-sm text-slate-400">No keys yet.</p>}
        {keys.map((k) => (
          <div key={k.id} className="flex items-center gap-3 p-3 text-sm">
            <span className="grow font-medium">{k.name}</span>
            <code className="text-xs text-slate-400">{k.prefix}…</code>
            <Badge className="bg-slate-100 text-slate-500">{k.scopes.join(', ')}</Badge>
          </div>
        ))}
      </Card>
    </div>
  )
}
