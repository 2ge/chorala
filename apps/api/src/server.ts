import { env } from '@chorala/config'
import { serve } from '@hono/node-server'
import { createApp } from './app.ts'

const port = Number(new URL(env.CHORALA_API_URL).port || '8787')

serve({ fetch: createApp().fetch, port }, (info) => {
  console.log(
    `✓ chorala-api listening on http://localhost:${info.port} (${env.CHORALA_DEPLOYMENT})`,
  )
})
