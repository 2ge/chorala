import { env } from '@heed/config'
import { serve } from '@hono/node-server'
import { createApp } from './app.ts'

const port = Number(new URL(env.HEED_API_URL).port || '8787')

serve({ fetch: createApp().fetch, port }, (info) => {
  console.log(`✓ heed-api listening on http://localhost:${info.port} (${env.HEED_DEPLOYMENT})`)
})
