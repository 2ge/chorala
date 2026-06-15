import { analytics } from '@chorala/core'
import { analyticsQuery } from '@chorala/types'
import { Hono } from 'hono'
import type { AppEnv } from '../types.ts'
import { reqParam } from '../util.ts'

// mounted at /projects/:projectId/analytics
export const analyticsRoutes = new Hono<AppEnv>().get('/', async (c) => {
  const projectId = reqParam(c, 'projectId')
  const query = {
    boardId: c.req.query('boardId'),
    timeframe: analyticsQuery.shape.timeframe.catch('30d').parse(c.req.query('timeframe')),
  }
  // `?format=csv` streams a flat report instead of the JSON dashboard payload.
  if (c.req.query('format') === 'csv') {
    const csv = await analytics.exportAnalyticsCsv(c.get('auth'), projectId, query)
    return c.body(csv, 200, {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="analytics-${query.timeframe}.csv"`,
    })
  }
  return c.json(await analytics.getAnalytics(c.get('auth'), projectId, query))
})
