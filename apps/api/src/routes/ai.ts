import {
  askFeedback,
  createProvider,
  draftChangelogFromPosts,
  extractFeatureRequests,
  summarizePost,
} from '@chorala/ai'
import { posts, projects } from '@chorala/core'
import { askInput, ingestInput } from '@chorala/types'
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
  // Autopilot: ingest a raw support conversation → AI extracts feature requests as pending posts.
  .post('/ingest', async (c) => {
    const ctx = c.get('auth')
    const projectId = reqParam(c, 'projectId')
    const input = ingestInput.parse(await c.req.json())
    const source = { type: input.source, url: input.url, author: input.author }
    const items = await extractFeatureRequests(provider, input.text)
    const created = []
    for (const item of items) {
      created.push(await posts.createReviewPost(ctx, projectId, { ...item, source }))
    }
    return c.json({ aiEnabled: provider.enabled, created }, 201)
  })
  // "Ask your feedback" — natural-language question answered over the project's posts.
  .post('/ask', async (c) => {
    const ctx = c.get('auth')
    const projectId = reqParam(c, 'projectId')
    await projects.getProject(ctx, projectId) // scope check
    const { question } = askInput.parse(await c.req.json())
    return c.json(await askFeedback(provider, projectId, question))
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
