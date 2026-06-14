import { env } from '@heed/config'
import { integrations, projects as projectSvc } from '@heed/core'
import { GithubIntegrationCard } from '@/components/integration-card'
import { Button, Card, Input, Label, Textarea } from '@/components/ui'
import { updateProjectSettings } from '@/lib/actions'
import { requireAuthContext } from '@/lib/session'

export default async function SettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const ctx = await requireAuthContext()
  const project = await projectSvc.getProject(ctx, projectId)
  const ints = await integrations.listIntegrations(ctx, projectId)
  const githubRepo = (
    ints.find((i) => i.type === 'github')?.config as { repo?: string } | undefined
  )?.repo
  const widget = project.widgetSettings as { primaryColor?: string; theme?: string; mode?: string }
  const cdn = env.HEED_WIDGET_CDN_URL

  const snippet = `<script>
  (function(w,d,s){w.Heed=w.Heed||function(){(w.Heed.q=w.Heed.q||[]).push(arguments)};
   s=d.createElement('script');s.async=1;s.src='${cdn}';d.head.appendChild(s);})(window,document);
  Heed('init', { projectKey: '${project.publicKey}', locale: 'auto' });
</script>`

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-xl font-bold">Project settings</h1>

      <Card className="p-5">
        <form action={updateProjectSettings} className="space-y-4">
          <input type="hidden" name="projectId" value={projectId} />
          <div>
            <Label>Name</Label>
            <Input name="name" defaultValue={project.name} />
          </div>
          <div>
            <Label>Allowed origins (one per line)</Label>
            <Textarea name="allowedOrigins" defaultValue={project.allowedOrigins.join('\n')} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Primary color</Label>
              <Input
                name="primaryColor"
                type="color"
                defaultValue={widget.primaryColor ?? '#6366f1'}
              />
            </div>
            <div>
              <Label>Theme</Label>
              <Input name="theme" defaultValue={widget.theme ?? 'light'} />
            </div>
            <div>
              <Label>Mode</Label>
              <Input name="mode" defaultValue={widget.mode ?? 'floating'} />
            </div>
          </div>
          <Button type="submit">Save settings</Button>
        </form>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="text-sm font-semibold text-slate-500">Keys</h2>
        <div>
          <Label>Public key (X-Heed-Key)</Label>
          <code className="block rounded bg-slate-50 p-2 text-xs">{project.publicKey}</code>
        </div>
        <div>
          <Label>End-user JWT secret (sign host SSO tokens with HS256)</Label>
          <code className="block break-all rounded bg-slate-50 p-2 text-xs">
            {project.endUserJwtSecret}
          </code>
        </div>
      </Card>

      <Card className="space-y-2 p-5">
        <h2 className="text-sm font-semibold text-slate-500">Embed snippet</h2>
        <pre className="overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
          {snippet}
        </pre>
      </Card>

      <Card className="p-5">
        <GithubIntegrationCard projectId={projectId} repo={githubRepo} />
      </Card>
    </div>
  )
}
