import { posts, tags } from '@heed/core'
import {
  adminCreatePostInput,
  changePostStatusInput,
  mergePostInput,
  postSort,
  tagPostInput,
  updatePostInput,
} from '@heed/types'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../types.ts'
import { reqParam } from '../util.ts'

const pinInput = z.object({ pinned: z.boolean() })

// mounted at /projects/:projectId/posts
export const postsRoutes = new Hono<AppEnv>()
  .get('/', async (c) => {
    const projectId = reqParam(c, 'projectId')
    const sortRaw = c.req.query('sort')
    return c.json(
      await posts.listPosts(c.get('auth'), projectId, {
        boardId: c.req.query('boardId'),
        statusId: c.req.query('statusId'),
        search: c.req.query('search'),
        sort: postSort.catch('top').parse(sortRaw),
        includeMerged: c.req.query('includeMerged') === 'true',
      }),
    )
  })
  .post('/', async (c) =>
    c.json(
      await posts.createPost(
        c.get('auth'),
        reqParam(c, 'projectId'),
        adminCreatePostInput.parse(await c.req.json()),
      ),
      201,
    ),
  )
  .get('/:id', async (c) =>
    c.json(await posts.getPost(c.get('auth'), reqParam(c, 'projectId'), c.req.param('id'))),
  )
  .patch('/:id', async (c) =>
    c.json(
      await posts.updatePost(
        c.get('auth'),
        reqParam(c, 'projectId'),
        c.req.param('id'),
        updatePostInput.parse(await c.req.json()),
      ),
    ),
  )
  .delete('/:id', async (c) =>
    c.json(await posts.deletePost(c.get('auth'), reqParam(c, 'projectId'), c.req.param('id'))),
  )
  .post('/:id/status', async (c) =>
    c.json(
      await posts.changeStatus(
        c.get('auth'),
        reqParam(c, 'projectId'),
        c.req.param('id'),
        changePostStatusInput.parse(await c.req.json()).statusId,
      ),
    ),
  )
  .post('/:id/pin', async (c) =>
    c.json(
      await posts.setPinned(
        c.get('auth'),
        reqParam(c, 'projectId'),
        c.req.param('id'),
        pinInput.parse(await c.req.json()).pinned,
      ),
    ),
  )
  .post('/:id/merge', async (c) =>
    c.json(
      await posts.mergePost(
        c.get('auth'),
        reqParam(c, 'projectId'),
        c.req.param('id'),
        mergePostInput.parse(await c.req.json()).targetPostId,
      ),
    ),
  )
  .post('/:id/tags', async (c) =>
    c.json(
      await tags.setPostTags(
        c.get('auth'),
        reqParam(c, 'projectId'),
        c.req.param('id'),
        tagPostInput.parse(await c.req.json()).tagIds,
      ),
    ),
  )
