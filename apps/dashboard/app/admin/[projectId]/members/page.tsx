import { members as memberSvc } from '@heed/core'
import { Badge, Button, Card, Input, Label, Select } from '@/components/ui'
import { inviteMember } from '@/lib/actions'
import { requireAuthContext } from '@/lib/session'

export default async function MembersPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const ctx = await requireAuthContext()
  const members = await memberSvc.listMembers(ctx)

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-xl font-bold">Members</h1>
      <Card className="divide-y divide-slate-100">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 p-3">
            <div className="grow">
              <p className="text-sm font-medium">{m.name || m.email}</p>
              <p className="text-xs text-slate-400">{m.email}</p>
            </div>
            <Badge className="bg-slate-100 text-slate-600">{m.role}</Badge>
          </div>
        ))}
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Invite a teammate</h2>
        <form action={inviteMember} className="flex items-end gap-2">
          <input type="hidden" name="projectId" value={projectId} />
          <div className="grow">
            <Label>Email</Label>
            <Input name="email" type="email" required />
          </div>
          <div>
            <Label>Role</Label>
            <Select name="role" defaultValue="member">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </Select>
          </div>
          <Button type="submit">Invite</Button>
        </form>
        <p className="mt-2 text-xs text-slate-400">
          End-users and votes are always unlimited — billing is per admin seat only.
        </p>
      </Card>
    </div>
  )
}
