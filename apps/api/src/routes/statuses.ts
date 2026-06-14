import { statuses } from '@heed/core'
import { createStatusInput, updateStatusInput } from '@heed/types'
import { Hono } from 'hono'
import type { AppEnv } from '../types.ts'
import { reqParam } from '../util.ts'

// mounted at /projects/:projectId/statuses
export const statusesRoutes = new Hono<AppEnv>()
  .get('/', async (c) =>
    c.json(await statuses.listStatuses(c.get('auth'), reqParam(c, 'projectId'))),
  )
  .post('/', async (c) =>
    c.json(
      await statuses.createStatus(
        c.get('auth'),
        reqParam(c, 'projectId'),
        createStatusInput.parse(await c.req.json()),
      ),
      201,
    ),
  )
  .patch('/:id', async (c) =>
    c.json(
      await statuses.updateStatus(
        c.get('auth'),
        reqParam(c, 'projectId'),
        c.req.param('id'),
        updateStatusInput.parse(await c.req.json()),
      ),
    ),
  )
  .delete('/:id', async (c) =>
    c.json(await statuses.deleteStatus(c.get('auth'), reqParam(c, 'projectId'), c.req.param('id'))),
  )
