import { analytics } from '@heed/core'
import { analyticsQuery } from '@heed/types'
import { Hono } from 'hono'
import type { AppEnv } from '../types.ts'
import { reqParam } from '../util.ts'

// mounted at /projects/:projectId/analytics
export const analyticsRoutes = new Hono<AppEnv>().get('/', async (c) =>
  c.json(
    await analytics.getAnalytics(c.get('auth'), reqParam(c, 'projectId'), {
      boardId: c.req.query('boardId'),
      timeframe: analyticsQuery.shape.timeframe.catch('30d').parse(c.req.query('timeframe')),
    }),
  ),
)
