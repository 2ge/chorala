import { apiKeys } from '@heed/core'
import { createApiKeyInput } from '@heed/types'
import { Hono } from 'hono'
import type { AppEnv } from '../types.ts'
import { reqParam } from '../util.ts'

// mounted at /projects/:projectId/keys
export const apiKeysRoutes = new Hono<AppEnv>()
  .get('/', async (c) => c.json(await apiKeys.listApiKeys(c.get('auth'), reqParam(c, 'projectId'))))
  .post('/', async (c) =>
    c.json(
      await apiKeys.createApiKey(
        c.get('auth'),
        reqParam(c, 'projectId'),
        createApiKeyInput.parse(await c.req.json()),
      ),
      201,
    ),
  )
  .delete('/:id', async (c) =>
    c.json(await apiKeys.revokeApiKey(c.get('auth'), reqParam(c, 'projectId'), c.req.param('id'))),
  )
