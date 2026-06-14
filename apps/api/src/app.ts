import { env } from '@chorala/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from './auth.ts'
import { DEMO_HTML, readFileSafe, WIDGET_JS, WIDGET_MAP } from './lib/assets.ts'
import { openapiDocument } from './lib/openapi.ts'
import { requireAuth } from './middleware/auth.ts'
import { notFoundHandler, onError } from './middleware/error.ts'
import { aiRoutes } from './routes/ai.ts'
import { analyticsRoutes } from './routes/analytics.ts'
import { apiKeysRoutes } from './routes/apiKeys.ts'
import { boardsRoutes } from './routes/boards.ts'
import { changelogRoutes } from './routes/changelog.ts'
import { commentsRoutes } from './routes/comments.ts'
import { orgRoutes } from './routes/org.ts'
import { postsRoutes } from './routes/posts.ts'
import { projectsRoutes } from './routes/projects.ts'
import { publicRoutes } from './routes/public.ts'
import { statusesRoutes } from './routes/statuses.ts'
import { tagsRoutes } from './routes/tags.ts'
import type { AppEnv } from './types.ts'

const WIDGET_STUB = `/* Chorala widget bundle not built. Run \`pnpm --filter @chorala/widget build\`. */
console.error('[chorala] widget.js not built');
`

export function createApp() {
  const app = new Hono<AppEnv>()
  app.onError(onError)
  app.notFound(notFoundHandler)

  app.get('/health', (c) =>
    c.json({ ok: true, service: 'chorala-api', deployment: env.CHORALA_DEPLOYMENT }),
  )

  // The embeddable widget bundle (served per CHORALA_WIDGET_CDN_URL). Loadable cross-origin.
  app.get('/widget.js', (c) => {
    const js = readFileSafe(WIDGET_JS) ?? WIDGET_STUB
    c.header('content-type', 'application/javascript; charset=utf-8')
    c.header('access-control-allow-origin', '*')
    // Short cache + revalidate so widget updates propagate quickly to embeds.
    c.header('cache-control', 'public, max-age=60, stale-while-revalidate=30')
    return c.body(js)
  })
  app.get('/widget.js.map', (c) => {
    const map = readFileSafe(WIDGET_MAP)
    if (!map) return c.notFound()
    c.header('content-type', 'application/json; charset=utf-8')
    return c.body(map)
  })

  // Dev convenience: serve the widget demo page (also shipped in the dashboard, Phase 5).
  app.get('/widget-demo.html', (c) => {
    const html = readFileSafe(DEMO_HTML)
    if (!html) return c.notFound()
    return c.html(html)
  })

  const api = new Hono<AppEnv>()

  // Better Auth handler (same-origin from the dashboard, no CORS needed).
  api.on(['GET', 'POST'], '/auth/*', (c) => auth.handler(c.req.raw))

  // Public / widget API — its OWN per-project CORS + key + rate limit. Registered before
  // the admin cors() so the dashboard-only CORS never touches cross-origin widget calls.
  api.route('/public', publicRoutes)

  // Machine-readable API spec (public, no auth) — powers /docs and SDK generators.
  api.get('/openapi.json', (c) => {
    c.header('access-control-allow-origin', '*')
    return c.json(openapiDocument())
  })

  // Admin surface: dashboard-origin CORS, then auth. Applies only to the routes below.
  api.use(
    '*',
    cors({
      origin: [env.CHORALA_PUBLIC_URL, 'https://www.chorala.com', 'https://idea.2pu.net'],
      credentials: true,
    }),
  )
  api.use('*', requireAuth)
  api.route('/projects', projectsRoutes)
  api.route('/projects/:projectId/boards', boardsRoutes)
  api.route('/projects/:projectId/statuses', statusesRoutes)
  // AI routes first so static paths (/posts/search) win over /posts/:id.
  api.route('/projects/:projectId', aiRoutes)
  api.route('/projects/:projectId/posts', postsRoutes)
  api.route('/projects/:projectId/posts/:postId/comments', commentsRoutes)
  api.route('/projects/:projectId/tags', tagsRoutes)
  api.route('/projects/:projectId/changelog', changelogRoutes)
  api.route('/projects/:projectId/keys', apiKeysRoutes)
  api.route('/projects/:projectId/analytics', analyticsRoutes)
  api.route('/org', orgRoutes)

  app.route('/api/v1', api)
  return app
}

export type App = ReturnType<typeof createApp>
