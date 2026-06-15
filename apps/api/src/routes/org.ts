import { members, notifications, orgs } from '@chorala/core'
import { inviteMemberInput, memberRole, updateOrgSettingsInput } from '@chorala/types'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../types.ts'

const roleInput = z.object({ role: memberRole })

// mounted at /org
export const orgRoutes = new Hono<AppEnv>()
  .get('/', async (c) => c.json(await orgs.getOrg(c.get('auth'))))
  .patch('/', async (c) =>
    c.json(
      await orgs.updateOrgSettings(c.get('auth'), updateOrgSettingsInput.parse(await c.req.json())),
    ),
  )
  .get('/members', async (c) => c.json(await members.listMembers(c.get('auth'))))
  .post('/members', async (c) =>
    c.json(
      await members.inviteMember(c.get('auth'), inviteMemberInput.parse(await c.req.json())),
      201,
    ),
  )
  .patch('/members/:id', async (c) =>
    c.json(
      await members.updateMemberRole(
        c.get('auth'),
        c.req.param('id'),
        roleInput.parse(await c.req.json()).role,
      ),
    ),
  )
  .delete('/members/:id', async (c) =>
    c.json(await members.removeMember(c.get('auth'), c.req.param('id'))),
  )
  // In-app notification centre for the signed-in admin.
  .get('/notifications', async (c) => c.json(await notifications.listForMember(c.get('auth'))))
  .post('/notifications/read', async (c) => c.json(await notifications.markAllRead(c.get('auth'))))
