import { createProvider, draftChangelogFromPosts, summarizePost } from '@heed/ai'
import { posts } from '@heed/core'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../types.ts'
import { reqParam } from '../util.ts'

const provider = createProvider()
const draftInput = z.object({ postIds: z.array(z.string()).min(1) })

// AI-backed admin endpoints, mounted at /projects/:projectId
export const aiRoutes = new Hono<AppEnv>()
  // Semantic search (falls back to text search when AI/embeddings are unavailable).
  .get('/posts/search', async (c) => {
    const ctx = c.get('auth')
    const projectId = reqParam(c, 'projectId')
    const q = c.req.query('q') ?? ''
    if (!q.trim()) return c.json([])
    if (provider.enabled && provider.canEmbed) {
      const [embedding] = await provider.embed([q])
      if (embedding) return c.json(await posts.semanticSearch(ctx, projectId, embedding))
    }
    // text fallback
    const rows = await posts.listPosts(ctx, projectId, { search: q, sort: 'top' })
    return c.json(
      rows.map((p) => ({ id: p.id, title: p.title, body: p.body, voteCount: p.voteCount })),
    )
  })
  .post('/posts/:id/summarize', async (c) => {
    const ctx = c.get('auth')
    const projectId = reqParam(c, 'projectId')
    await posts.getPost(ctx, projectId, reqParam(c, 'id')) // scope check
    const summary = await summarizePost(provider, reqParam(c, 'id'))
    return c.json({ summary, aiEnabled: provider.enabled })
  })
  .post('/changelog/draft', async (c) => {
    const ctx = c.get('auth')
    const projectId = reqParam(c, 'projectId')
    const { postIds } = draftInput.parse(await c.req.json())
    // ensure all posts belong to the caller's project
    for (const id of postIds) await posts.getPost(ctx, projectId, id)
    const markdown = await draftChangelogFromPosts(provider, postIds)
    return c.json({ markdown })
  })
