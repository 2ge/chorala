import { env } from '@heed/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from './auth.ts'
import { DEMO_HTML, readFileSafe, WIDGET_JS, WIDGET_MAP } from './lib/assets.ts'
import { requireAuth } from './middleware/auth.ts'
import { notFoundHandler, onError } from './middleware/error.ts'
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

const WIDGET_STUB = `/* Heed widget bundle not built. Run \`pnpm --filter @heed/widget build\`. */
console.error('[heed] widget.js not built');
`

export function createApp() {
  const app = new Hono<AppEnv>()
  app.onError(onError)
  app.notFound(notFoundHandler)

  app.get('/health', (c) =>
    c.json({ ok: true, service: 'heed-api', deployment: env.HEED_DEPLOYMENT }),
  )

  // The embeddable widget bundle (served per HEED_WIDGET_CDN_URL). Loadable cross-origin.
  app.get('/widget.js', (c) => {
    const js = readFileSafe(WIDGET_JS) ?? WIDGET_STUB
    c.header('content-type', 'application/javascript; charset=utf-8')
    c.header('access-control-allow-origin', '*')
    c.header('cache-control', 'public, max-age=300')
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
  // CORS for the dashboard admin surface (public/widget CORS is per-project, Phase 3).
  api.use('*', cors({ origin: [env.HEED_PUBLIC_URL], credentials: true }))

  // Better Auth handler — registered before requireAuth so auth endpoints stay public.
  api.on(['GET', 'POST'], '/auth/*', (c) => auth.handler(c.req.raw))

  // Public / widget API — its own auth (project key + end-user JWT/cookie), CORS, rate limit.
  api.route('/public', publicRoutes)

  // Everything below requires an authenticated admin (session or api key).
  api.use('*', requireAuth)
  api.route('/projects', projectsRoutes)
  api.route('/projects/:projectId/boards', boardsRoutes)
  api.route('/projects/:projectId/statuses', statusesRoutes)
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
