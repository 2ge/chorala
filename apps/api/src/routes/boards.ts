import { boards } from '@heed/core'
import { createBoardInput, updateBoardInput } from '@heed/types'
import { Hono } from 'hono'
import type { AppEnv } from '../types.ts'
import { reqParam } from '../util.ts'

// mounted at /projects/:projectId/boards
export const boardsRoutes = new Hono<AppEnv>()
  .get('/', async (c) => c.json(await boards.listBoards(c.get('auth'), reqParam(c, 'projectId'))))
  .post('/', async (c) =>
    c.json(
      await boards.createBoard(
        c.get('auth'),
        reqParam(c, 'projectId'),
        createBoardInput.parse(await c.req.json()),
      ),
      201,
    ),
  )
  .get('/:id', async (c) =>
    c.json(await boards.getBoard(c.get('auth'), reqParam(c, 'projectId'), c.req.param('id'))),
  )
  .patch('/:id', async (c) =>
    c.json(
      await boards.updateBoard(
        c.get('auth'),
        reqParam(c, 'projectId'),
        c.req.param('id'),
        updateBoardInput.parse(await c.req.json()),
      ),
    ),
  )
  .delete('/:id', async (c) =>
    c.json(await boards.deleteBoard(c.get('auth'), reqParam(c, 'projectId'), c.req.param('id'))),
  )
