import { posts, storage, tags, votes } from '@chorala/core'
import {
  adminCreatePostInput,
  changePostStatusInput,
  mergePostInput,
  postSort,
  tagPostInput,
  updatePostInput,
  voteForInput,
} from '@chorala/types'
import { type Context, Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../types.ts'
import { reqParam } from '../util.ts'

const pinInput = z.object({ pinned: z.boolean() })

// shared list filters (used by JSON list + CSV export)
const listOpts = (c: Context<AppEnv>) => ({
  boardId: c.req.query('boardId'),
  statusId: c.req.query('statusId'),
  appVersion: c.req.query('appVersion'),
  companyId: c.req.query('companyId'),
  plan: c.req.query('plan'),
  minMrr: c.req.query('minMrr') ? Number(c.req.query('minMrr')) : undefined,
  assigneeMemberId: c.req.query('assignee'),
  reviewStatus: c.req.query('review') as 'none' | 'pending' | 'dismissed' | 'all' | undefined,
  search: c.req.query('search'),
  sort: postSort.catch('top').parse(c.req.query('sort')),
  includeMerged: c.req.query('includeMerged') === 'true',
})

// mounted at /projects/:projectId/posts
export const postsRoutes = new Hono<AppEnv>()
  .get('/', async (c) => {
    const projectId = reqParam(c, 'projectId')
    // `?format=csv` streams the same filtered list as a spreadsheet export.
    if (c.req.query('format') === 'csv') {
      const csv = await posts.exportPostsCsv(c.get('auth'), projectId, listOpts(c))
      c.header('content-type', 'text/csv; charset=utf-8')
      c.header('content-disposition', 'attachment; filename="posts.csv"')
      return c.body(csv)
    }
    return c.json(await posts.listPosts(c.get('auth'), projectId, listOpts(c)))
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
  // Autopilot review queue: approve a pending AI-ingested post (→ live) or dismiss it.
  .post('/:id/approve', async (c) =>
    c.json(await posts.approvePost(c.get('auth'), reqParam(c, 'projectId'), c.req.param('id'))),
  )
  .post('/:id/dismiss', async (c) =>
    c.json(await posts.dismissPost(c.get('auth'), reqParam(c, 'projectId'), c.req.param('id'))),
  )
  // Cast a vote on behalf of a customer (sales/support logging a request).
  .post('/:id/vote-for', async (c) =>
    c.json(
      await votes.voteForUser(
        c.get('auth'),
        reqParam(c, 'projectId'),
        c.req.param('id'),
        voteForInput.parse(await c.req.json()),
      ),
    ),
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
