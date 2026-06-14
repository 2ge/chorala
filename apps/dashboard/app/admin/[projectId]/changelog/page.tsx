import { changelog as changelogSvc } from '@chorala/core'
import { Badge, Button, Card, Input, Label, Textarea } from '@/components/ui'
import { saveChangelog } from '@/lib/actions'
import { requireAuthContext } from '@/lib/session'

export default async function ChangelogPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const ctx = await requireAuthContext()
  const entries = await changelogSvc.listChangelog(ctx, projectId)

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div>
        <h1 className="mb-4 text-xl font-bold">Changelog</h1>
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-500">New entry</h2>
          <form action={saveChangelog} className="space-y-3">
            <input type="hidden" name="projectId" value={projectId} />
            <div>
              <Label>Title</Label>
              <Input name="title" required />
            </div>
            <div>
              <Label>Body (markdown)</Label>
              <Textarea name="body" />
            </div>
            <div>
              <Label>Labels (comma-separated)</Label>
              <Input name="labels" placeholder="new, improved, fixed" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" name="publish" value="1">
                Publish
              </Button>
              <Button type="submit" variant="outline">
                Save draft
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="mt-10 text-sm font-semibold text-slate-500">Entries</h2>
        {entries.length === 0 && <p className="text-sm text-slate-400">Nothing published yet.</p>}
        {entries.map((e) => (
          <Card key={e.id} className="p-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{e.title}</h3>
              <Badge
                className={
                  e.status === 'published'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-500'
                }
              >
                {e.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">{e.body}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
