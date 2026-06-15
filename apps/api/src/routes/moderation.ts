import { moderation } from '@chorala/core'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../types.ts'
import { reqParam } from '../util.ts'

const actionInput = z.object({ action: z.enum(['hide', 'unhide', 'approve']) })

// mounted at /projects/:projectId/moderation
export const moderationRoutes = new Hono<AppEnv>()
  .get('/', async (c) =>
    c.json(await moderation.listModerationQueue(c.get('auth'), reqParam(c, 'projectId'))),
  )
  .post('/posts/:id', async (c) =>
    c.json(
      await moderation.moderatePost(
        c.get('auth'),
        reqParam(c, 'projectId'),
        c.req.param('id'),
        actionInput.parse(await c.req.json()).action,
      ),
    ),
  )
  .post('/comments/:id', async (c) =>
    c.json(
      await moderation.moderateComment(
        c.get('auth'),
        reqParam(c, 'projectId'),
        c.req.param('id'),
        actionInput.parse(await c.req.json()).action,
      ),
    ),
  )
