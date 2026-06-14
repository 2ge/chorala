import { tags } from '@chorala/core'
import { createTagInput } from '@chorala/types'
import { Hono } from 'hono'
import type { AppEnv } from '../types.ts'
import { reqParam } from '../util.ts'

// mounted at /projects/:projectId/tags
export const tagsRoutes = new Hono<AppEnv>()
  .get('/', async (c) => c.json(await tags.listTags(c.get('auth'), reqParam(c, 'projectId'))))
  .post('/', async (c) =>
    c.json(
      await tags.createTag(
        c.get('auth'),
        reqParam(c, 'projectId'),
        createTagInput.parse(await c.req.json()),
      ),
      201,
    ),
  )
  .delete('/:id', async (c) =>
    c.json(await tags.deleteTag(c.get('auth'), reqParam(c, 'projectId'), c.req.param('id'))),
  )
