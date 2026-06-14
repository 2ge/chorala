import { projects as projectService } from '@heed/core'
import { redirect } from 'next/navigation'
import { Button, Card, Input, Label } from '@/components/ui'
import { createProject } from '@/lib/actions'
import { requireAuthContext } from '@/lib/session'

export default async function AdminHome() {
  const ctx = await requireAuthContext()
  const projects = await projectService.listProjects(ctx)
  if (projects[0]) redirect(`/admin/${projects[0].id}/posts`)

  return (
    <main className="mx-auto max-w-md p-8">
      <Card className="p-6">
        <h1 className="mb-1 text-lg font-bold">Create your first project</h1>
        <p className="mb-4 text-sm text-slate-500">A project holds boards, posts and a widget.</p>
        <form action={createProject} className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input name="name" placeholder="Acme Feedback" required />
          </div>
          <div>
            <Label>Slug</Label>
            <Input name="slug" placeholder="acme" pattern="[a-z0-9-]+" required />
          </div>
          <Button type="submit" className="w-full">
            Create project
          </Button>
        </form>
      </Card>
    </main>
  )
}
