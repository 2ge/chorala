import { scoreFields } from '@chorala/core'
import { createScoreFieldInput, updateScoreFieldInput } from '@chorala/types'
import { Hono } from 'hono'
import type { AppEnv } from '../types.ts'
import { reqParam } from '../util.ts'

// mounted at /projects/:projectId/score-fields
export const scoreFieldsRoutes = new Hono<AppEnv>()
  .get('/', async (c) =>
    c.json(await scoreFields.listScoreFields(c.get('auth'), reqParam(c, 'projectId'))),
  )
  .post('/', async (c) =>
    c.json(
      await scoreFields.createScoreField(
        c.get('auth'),
        reqParam(c, 'projectId'),
        createScoreFieldInput.parse(await c.req.json()),
      ),
      201,
    ),
  )
  .patch('/:id', async (c) =>
    c.json(
      await scoreFields.updateScoreField(
        c.get('auth'),
        reqParam(c, 'projectId'),
        c.req.param('id'),
        updateScoreFieldInput.parse(await c.req.json()),
      ),
    ),
  )
  .delete('/:id', async (c) =>
    c.json(
      await scoreFields.deleteScoreField(
        c.get('auth'),
        reqParam(c, 'projectId'),
        c.req.param('id'),
      ),
    ),
  )
