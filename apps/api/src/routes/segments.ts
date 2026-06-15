import { segments } from '@chorala/core'
import { createSegmentInput, segmentDefinition, updateSegmentInput } from '@chorala/types'
import { Hono } from 'hono'
import type { AppEnv } from '../types.ts'
import { reqParam } from '../util.ts'

// mounted at /projects/:projectId/segments
export const segmentsRoutes = new Hono<AppEnv>()
  .get('/', async (c) =>
    c.json(await segments.listSegments(c.get('auth'), reqParam(c, 'projectId'))),
  )
  // Live count for an unsaved definition (powers the builder's "→ N users").
  .post('/preview', async (c) =>
    c.json(
      await segments.previewSegment(
        c.get('auth'),
        reqParam(c, 'projectId'),
        segmentDefinition.parse(await c.req.json()),
      ),
    ),
  )
  .post('/', async (c) =>
    c.json(
      await segments.createSegment(
        c.get('auth'),
        reqParam(c, 'projectId'),
        createSegmentInput.parse(await c.req.json()),
      ),
      201,
    ),
  )
  .get('/:id', async (c) =>
    c.json(await segments.getSegment(c.get('auth'), reqParam(c, 'projectId'), c.req.param('id'))),
  )
  .patch('/:id', async (c) =>
    c.json(
      await segments.updateSegment(
        c.get('auth'),
        reqParam(c, 'projectId'),
        c.req.param('id'),
        updateSegmentInput.parse(await c.req.json()),
      ),
    ),
  )
  .delete('/:id', async (c) =>
    c.json(
      await segments.deleteSegment(c.get('auth'), reqParam(c, 'projectId'), c.req.param('id')),
    ),
  )
