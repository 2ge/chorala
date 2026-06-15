import { companies } from '@chorala/core'
import { updateCompanyInput } from '@chorala/types'
import { Hono } from 'hono'
import type { AppEnv } from '../types.ts'
import { reqParam } from '../util.ts'

// mounted at /projects/:projectId/companies
export const companiesRoutes = new Hono<AppEnv>()
  .get('/', async (c) =>
    c.json(await companies.listCompanies(c.get('auth'), reqParam(c, 'projectId'))),
  )
  .get('/:id', async (c) =>
    c.json(await companies.getCompany(c.get('auth'), reqParam(c, 'projectId'), c.req.param('id'))),
  )
  .patch('/:id', async (c) =>
    c.json(
      await companies.updateCompany(
        c.get('auth'),
        reqParam(c, 'projectId'),
        c.req.param('id'),
        updateCompanyInput.parse(await c.req.json()),
      ),
    ),
  )
