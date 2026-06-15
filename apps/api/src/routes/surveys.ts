import { surveys } from '@chorala/core'
import { createSurveyInput, updateSurveyInput } from '@chorala/types'
import { Hono } from 'hono'
import type { AppEnv } from '../types.ts'
import { reqParam } from '../util.ts'

// mounted at /projects/:projectId/surveys
export const surveysRoutes = new Hono<AppEnv>()
  .get('/', async (c) => c.json(await surveys.listSurveys(c.get('auth'), reqParam(c, 'projectId'))))
  .post('/', async (c) =>
    c.json(
      await surveys.createSurvey(
        c.get('auth'),
        reqParam(c, 'projectId'),
        createSurveyInput.parse(await c.req.json()),
      ),
      201,
    ),
  )
  .get('/:id', async (c) =>
    c.json(await surveys.getSurvey(c.get('auth'), reqParam(c, 'projectId'), c.req.param('id'))),
  )
  .get('/:id/results', async (c) =>
    c.json(await surveys.getResults(c.get('auth'), reqParam(c, 'projectId'), c.req.param('id'))),
  )
  .patch('/:id', async (c) =>
    c.json(
      await surveys.updateSurvey(
        c.get('auth'),
        reqParam(c, 'projectId'),
        c.req.param('id'),
        updateSurveyInput.parse(await c.req.json()),
      ),
    ),
  )
  .delete('/:id', async (c) =>
    c.json(await surveys.deleteSurvey(c.get('auth'), reqParam(c, 'projectId'), c.req.param('id'))),
  )
