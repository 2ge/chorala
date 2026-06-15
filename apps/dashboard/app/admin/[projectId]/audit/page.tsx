import { audit } from '@chorala/core'
import { Card } from '@/components/ui'
import { requireAuthContext } from '@/lib/session'

// Human-readable verbs for the audit `action` codes.
const ACTION_LABEL: Record<string, string> = {
  'member.invited': 'invited a member',
  'member.role_changed': 'changed a member’s role',
  'member.removed': 'removed a member',
  'project.created': 'created a project',
  'project.updated': 'updated a project',
  'project.deleted': 'deleted a project',
  'org.settings_updated': 'updated org settings',
  'apikey.created': 'created an API key',
  'apikey.revoked': 'revoked an API key',
  'post.status_changed': 'changed a post’s status',
  'post.hide': 'hid a post',
  'post.unhide': 'restored a post',
  'post.approve': 'approved a flagged post',
  'comment.hide': 'hid a comment',
  'comment.unhide': 'restored a comment',
  'comment.approve': 'approved a flagged comment',
}

export default async function AuditPage({ params }: { params: Promise<{ projectId: string }> }) {
  await params
  const ctx = await requireAuthContext()
  const entries = await audit.listAuditLog(ctx, { limit: 200 })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-[-0.02em]">Audit log</h1>
        <p className="mt-1 text-sm text-ink-soft">
          An immutable, org-wide record of every administrative action — who did what, and when.
          Visible to org admins only.
        </p>
      </div>

      {entries.length === 0 ? (
        <Card className="p-8 text-center text-sm text-ink-faint">
          No activity recorded yet. Admin actions (invites, role changes, project changes,
          moderation, key management) will appear here.
        </Card>
      ) : (
        <Card className="divide-y divide-line p-0">
          {entries.map((e) => {
            const who = e.actorName || e.actorEmail || e.actor
            return (
              <div key={e.id} className="flex items-baseline gap-3 px-4 py-3 text-sm">
                <time
                  className="w-36 shrink-0 tabular-nums text-xs text-ink-faint"
                  dateTime={new Date(e.createdAt).toISOString()}
                >
                  {new Date(e.createdAt).toLocaleString()}
                </time>
                <p className="min-w-0 grow">
                  <span className="font-medium text-ink">{who}</span>{' '}
                  <span className="text-ink-soft">{ACTION_LABEL[e.action] ?? e.action}</span>{' '}
                  <code className="rounded bg-ink/[0.05] px-1 text-xs text-ink-faint">
                    {e.target}
                  </code>
                </p>
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}
