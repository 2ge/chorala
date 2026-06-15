import { integrations, unauthorized } from '@chorala/core'
import { inboundEvent } from '@chorala/types'
import { Hono } from 'hono'
import type { AppEnv } from '../types.ts'

/**
 * Segment-compatible inbound webhook (Phase 15). External CDPs / connectors POST `identify`
 * and `group` events here to auto-populate end-users + companies. Authenticated by the
 * per-project signing secret (Bearer), NOT the admin session — so it lives outside admin auth.
 */
export const inboundRoutes = new Hono<AppEnv>().post('/:projectId', async (c) => {
  const projectId = c.req.param('projectId')
  const token = (c.req.header('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token || !(await integrations.verifyInboundSecret(projectId, token))) {
    throw unauthorized('Invalid inbound secret')
  }
  const event = inboundEvent.parse(await c.req.json())
  return c.json(await integrations.processInbound(projectId, event))
})
