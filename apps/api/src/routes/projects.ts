import { projects } from '@chorala/core'
import { createProjectInput, updateProjectInput } from '@chorala/types'
import { Hono } from 'hono'
import type { AppEnv } from '../types.ts'

export const projectsRoutes = new Hono<AppEnv>()
  .get('/', async (c) => c.json(await projects.listProjects(c.get('auth'))))
  .post('/', async (c) =>
    c.json(
      await projects.createProject(c.get('auth'), createProjectInput.parse(await c.req.json())),
      201,
    ),
  )
  .get('/:id', async (c) => c.json(await projects.getProject(c.get('auth'), c.req.param('id'))))
  .patch('/:id', async (c) =>
    c.json(
      await projects.updateProject(
        c.get('auth'),
        c.req.param('id'),
        updateProjectInput.parse(await c.req.json()),
      ),
    ),
  )
  .delete('/:id', async (c) =>
    c.json(await projects.deleteProject(c.get('auth'), c.req.param('id'))),
  )
