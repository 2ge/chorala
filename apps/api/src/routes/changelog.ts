import { changelog } from '@chorala/core'
import { createChangelogInput, updateChangelogInput } from '@chorala/types'
import { Hono } from 'hono'
import type { AppEnv } from '../types.ts'
import { reqParam } from '../util.ts'

// mounted at /projects/:projectId/changelog
export const changelogRoutes = new Hono<AppEnv>()
  .get('/', async (c) =>
    c.json(await changelog.listChangelog(c.get('auth'), reqParam(c, 'projectId'))),
  )
  .post('/', async (c) =>
    c.json(
      await changelog.createChangelog(
        c.get('auth'),
        reqParam(c, 'projectId'),
        createChangelogInput.parse(await c.req.json()),
      ),
      201,
    ),
  )
  .get('/:id', async (c) =>
    c.json(
      await changelog.getChangelog(c.get('auth'), reqParam(c, 'projectId'), c.req.param('id')),
    ),
  )
  .patch('/:id', async (c) =>
    c.json(
      await changelog.updateChangelog(
        c.get('auth'),
        reqParam(c, 'projectId'),
        c.req.param('id'),
        updateChangelogInput.parse(await c.req.json()),
      ),
    ),
  )
  .delete('/:id', async (c) =>
    c.json(
      await changelog.deleteChangelog(c.get('auth'), reqParam(c, 'projectId'), c.req.param('id')),
    ),
  )
