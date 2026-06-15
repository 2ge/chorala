import { insights } from '@chorala/core'
import { createInsightInput } from '@chorala/types'
import { Hono } from 'hono'
import type { AppEnv } from '../types.ts'
import { reqParam } from '../util.ts'

// mounted at /projects/:projectId/insights
export const insightsRoutes = new Hono<AppEnv>()
  .get('/', async (c) =>
    c.json(
      await insights.listInsights(c.get('auth'), reqParam(c, 'projectId'), {
        postId: c.req.query('postId'),
      }),
    ),
  )
  .post('/', async (c) =>
    c.json(
      await insights.addInsight(
        c.get('auth'),
        reqParam(c, 'projectId'),
        createInsightInput.parse(await c.req.json()),
      ),
      201,
    ),
  )
  .delete('/:id', async (c) =>
    c.json(
      await insights.removeInsight(c.get('auth'), reqParam(c, 'projectId'), c.req.param('id')),
    ),
  )
