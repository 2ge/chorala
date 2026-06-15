import { env } from '@chorala/config'
import { integrations, projects as projectSvc } from '@chorala/core'
import { GithubIntegrationCard } from '@/components/integration-card'
import { Button, Card, Input, Label, Textarea } from '@/components/ui'
import { updateProjectSettings } from '@/lib/actions'
import { requireAuthContext } from '@/lib/session'

/** Small muted helper line under a field label. */
function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs leading-relaxed text-ink-faint">{children}</p>
}

export default async function SettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const ctx = await requireAuthContext()
  const project = await projectSvc.getProject(ctx, projectId)
  const ints = await integrations.listIntegrations(ctx, projectId)
  const githubRepo = (
    ints.find((i) => i.type === 'github')?.config as { repo?: string } | undefined
  )?.repo
  const widget = project.widgetSettings as { primaryColor?: string; theme?: string; mode?: string }
  const cdn = env.CHORALA_WIDGET_CDN_URL

  const snippet = `<script async src="${cdn}" data-chorala-key="${project.publicKey}"></script>`

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <h1 className="font-display text-2xl tracking-[-0.01em]">Project settings</h1>

      <Card className="p-5">
        <form action={updateProjectSettings} className="space-y-4">
          <input type="hidden" name="projectId" value={projectId} />
          <div>
            <Label>Name</Label>
            <Input name="name" defaultValue={project.name} />
            <Hint>Shown as the title of your public feedback portal and in emails.</Hint>
          </div>
          <div>
            <Label>Allowed origins (one per line)</Label>
            <Textarea name="allowedOrigins" defaultValue={project.allowedOrigins.join('\n')} />
            <Hint>
              The websites permitted to load the widget and call your public API (browser CORS). Add
              each site the embed runs on, e.g. <code>https://acme.com</code>. Requests from other
              origins are refused. Leave a single <code>*</code> to allow any origin.
            </Hint>
          </div>
          <div>
            <Label>Widget appearance</Label>
            <div className="mt-1 grid grid-cols-3 gap-3">
              <div>
                <Input
                  name="primaryColor"
                  type="color"
                  defaultValue={widget.primaryColor ?? '#6366f1'}
                />
                <Hint>Accent</Hint>
              </div>
              <div>
                <Input name="theme" defaultValue={widget.theme ?? 'light'} />
                <Hint>light / dark</Hint>
              </div>
              <div>
                <Input name="mode" defaultValue={widget.mode ?? 'floating'} />
                <Hint>floating / inline</Hint>
              </div>
            </div>
          </div>
          <Button type="submit">Save settings</Button>
        </form>
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold">Keys</h2>
          <p className="mt-0.5 text-xs text-ink-faint">
            Two very different keys — mind which is which.
          </p>
        </div>
        <div>
          <Label>Public key (publishable)</Label>
          <code className="mt-1 block break-all rounded-md bg-ink/[0.05] p-2 text-xs">
            {project.publicKey}
          </code>
          <Hint>
            <strong className="text-ink-soft">Safe to expose</strong> — this is the{' '}
            <code>pk_…</code> you put in the embed (<code>data-chorala-key</code>) and send as the{' '}
            <code>X-Chorala-Key</code> header on the public/widget API. It only identifies the
            project and grants access to the public surface (read boards, vote, comment). It is{' '}
            <em>not</em> a secret and can sit in client-side code.
          </Hint>
        </div>
        <div>
          <Label>End-user JWT secret</Label>
          <code className="mt-1 block break-all rounded-md bg-ink/[0.05] p-2 text-xs">
            {project.endUserJwtSecret}
          </code>
          <Hint>
            <strong className="text-ink-soft">Keep secret — server-side only.</strong> Sign an HS256
            JWT with this on your backend to tell Chorala <em>who</em> a visitor is (SSO), so their
            votes are attributed and de-duplicated across devices. Pass the token as{' '}
            <code>X-Chorala-User</code> (or <code>data-jwt</code> on the embed). Never ship this to
            the browser.
          </Hint>
        </div>
      </Card>

      <Card className="space-y-2 p-5">
        <h2 className="text-sm font-semibold">Embed snippet</h2>
        <p className="text-xs text-ink-faint">
          Paste this one tag on any page — the floating widget self-configures from it. Uses the
          public key above.
        </p>
        <pre className="overflow-x-auto rounded-md bg-ink p-3 text-xs text-paper">{snippet}</pre>
      </Card>

      <Card className="p-5">
        <GithubIntegrationCard projectId={projectId} repo={githubRepo} />
      </Card>
    </div>
  )
}
