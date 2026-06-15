import { posts, storage, tags } from '@chorala/core'
import {
  adminCreatePostInput,
  changePostStatusInput,
  mergePostInput,
  postSort,
  tagPostInput,
  updatePostInput,
} from '@chorala/types'
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
        appVersion: c.req.query('appVersion'),
        companyId: c.req.query('companyId'),
        plan: c.req.query('plan'),
        minMrr: c.req.query('minMrr') ? Number(c.req.query('minMrr')) : undefined,
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
  // The submission context map (userAgent, platform, plan, …) — admin-only.
  .get('/:id/context', async (c) =>
    c.json(await posts.getContext(c.get('auth'), reqParam(c, 'projectId'), c.req.param('id'))),
  )
  // Attachment metadata (screenshots) for a post — bytes are streamed by the dashboard.
  .get('/:id/attachments', async (c) =>
    c.json(
      await storage.listAttachmentsForPost(
        c.get('auth'),
        reqParam(c, 'projectId'),
        c.req.param('id'),
      ),
    ),
  )
  // The post author's end-user + their company (revenue context).
  .get('/:id/customer', async (c) =>
    c.json(await posts.getPostCustomer(c.get('auth'), reqParam(c, 'projectId'), c.req.param('id'))),
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
