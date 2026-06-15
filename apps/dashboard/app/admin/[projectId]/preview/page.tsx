import { projects as projectSvc } from '@chorala/core'
import Link from 'next/link'
import { PortalPreview } from '@/components/portal-preview'
import { Card } from '@/components/ui'
import { requireAuthContext } from '@/lib/session'

export default async function PreviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const ctx = await requireAuthContext()
  const project = await projectSvc.getProject(ctx, projectId)
  const liveUrl = project.customDomain ? `https://${project.customDomain}` : `/portal/${projectId}`

  const customizable: { label: string; detail: string; href?: string }[] = [
    {
      label: 'Name & accent colour',
      detail: 'The portal title and the colour on every button, vote, chip and badge.',
      href: `/admin/${projectId}/settings`,
    },
    {
      label: 'Light / dark theme',
      detail: 'Match your brand’s look.',
      href: `/admin/${projectId}/settings`,
    },
    {
      label: 'Boards & descriptions',
      detail:
        'Name your boards (Feature Requests, Bugs…) and write the blurb shown under the chips.',
    },
    {
      label: 'Statuses',
      detail:
        'Rename/recolour the badges (Open, Planned, In Progress, Complete) and pick which show on the Roadmap.',
    },
    {
      label: 'Tags',
      detail: 'Topic chips on posts — clickable to filter the board.',
    },
    {
      label: 'Changelog & Roadmap',
      detail: 'Publish updates and show what’s planned/shipped.',
      href: `/admin/${projectId}/changelog`,
    },
    {
      label: 'Custom domain & embed',
      detail: 'Serve it on your own domain, or drop the widget on your site with one script tag.',
      href: `/admin/${projectId}/settings`,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-[-0.02em]">Portal preview</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Exactly what your end-users see at{' '}
          <a
            href={liveUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-accent hover:underline"
          >
            {project.customDomain ?? liveUrl}
          </a>
          . Interact with it — vote, open a post, suggest an idea — it’s the real thing.
        </p>
      </div>

      <PortalPreview src={liveUrl} />

      <Card className="p-5">
        <h2 className="text-sm font-semibold">What you can customise</h2>
        <ul className="mt-3 divide-y divide-line/70">
          {customizable.map((c) => (
            <li key={c.label} className="flex items-start gap-3 py-2.5">
              <div className="min-w-0 grow">
                <p className="text-sm font-medium">{c.label}</p>
                <p className="text-xs text-ink-faint">{c.detail}</p>
              </div>
              {c.href && (
                <Link
                  href={c.href}
                  className="shrink-0 text-xs font-semibold text-accent transition hover:underline"
                >
                  Edit →
                </Link>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
