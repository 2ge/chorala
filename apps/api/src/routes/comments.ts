import { comments } from '@heed/core'
import { createCommentInput } from '@heed/types'
import { Hono } from 'hono'
import type { AppEnv } from '../types.ts'
import { reqParam } from '../util.ts'

// mounted at /projects/:projectId/posts/:postId/comments
export const commentsRoutes = new Hono<AppEnv>()
  .get('/', async (c) =>
    c.json(
      await comments.listComments(reqParam(c, 'projectId'), reqParam(c, 'postId'), {
        includeInternal: true,
      }),
    ),
  )
  .post('/', async (c) => {
    const ctx = c.get('auth')
    const input = createCommentInput.parse(await c.req.json())
    return c.json(
      await comments.createComment(reqParam(c, 'projectId'), reqParam(c, 'postId'), input, {
        memberId: ctx.memberId,
      }),
      201,
    )
  })
  .delete('/:id', async (c) =>
    c.json(
      await comments.deleteComment(
        reqParam(c, 'projectId'),
        reqParam(c, 'postId'),
        c.req.param('id'),
      ),
    ),
  )
