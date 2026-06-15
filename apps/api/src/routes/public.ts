import { endUsers, publicFeed, storage, surveys, unauthorized, votes } from '@chorala/core'
import {
  changelogSubscribeInput,
  createAttachmentInput,
  createCommentInput,
  createPostInput,
  identifyInput,
  postSort,
  submitSurveyResponseInput,
} from '@chorala/types'
import { Hono } from 'hono'
import { requireEndUser, resolveEndUser } from '../lib/identity.ts'
import { verifyEndUserJwt } from '../lib/jwt.ts'
import { publicProject } from '../middleware/public.ts'
import type { PublicEnv } from '../types.ts'

export const publicRoutes = new Hono<PublicEnv>()
publicRoutes.use('*', publicProject)

publicRoutes
  .get('/boards', async (c) => {
    const project = c.get('project')
    const eu = await resolveEndUser(c, project)
    return c.json(
      await publicFeed.listPublicBoards(project.id, {
        boardSlug: c.req.query('boardSlug'),
        statusId: c.req.query('statusId'),
        tagId: c.req.query('tagId'),
        sort: postSort.catch('top').parse(c.req.query('sort')),
        locale: c.req.query('locale'),
        search: c.req.query('search'),
        endUserId: eu?.id,
      }),
    )
  })
  .get('/posts/:id', async (c) => {
    const project = c.get('project')
    const eu = await resolveEndUser(c, project)
    return c.json(
      await publicFeed.getPublicPost(project.id, c.req.param('id'), {
        locale: c.req.query('locale'),
        endUserId: eu?.id,
      }),
    )
  })
  .post('/posts', async (c) => {
    const project = c.get('project')
    const eu = await requireEndUser(c, project)
    const input = createPostInput.parse(await c.req.json())
    return c.json(await publicFeed.createPublicPost(project.id, eu.id, input), 201)
  })
  .post('/attachments', async (c) => {
    const project = c.get('project')
    const eu = await requireEndUser(c, project)
    const input = createAttachmentInput.parse(await c.req.json())
    return c.json(await storage.createPublicAttachment(project.id, eu.id, input), 201)
  })
  .post('/posts/:id/vote', async (c) => {
    const project = c.get('project')
    const eu = await requireEndUser(c, project)
    return c.json(await votes.setVote(project.id, c.req.param('id'), eu.id, true))
  })
  .delete('/posts/:id/vote', async (c) => {
    const project = c.get('project')
    const eu = await requireEndUser(c, project)
    return c.json(await votes.setVote(project.id, c.req.param('id'), eu.id, false))
  })
  .post('/posts/:id/comments', async (c) => {
    const project = c.get('project')
    const eu = await requireEndUser(c, project)
    const input = createCommentInput.parse(await c.req.json())
    return c.json(
      await publicFeed.addPublicComment(project.id, c.req.param('id'), eu.id, input),
      201,
    )
  })
  .get('/roadmap', async (c) => {
    const project = c.get('project')
    const eu = await resolveEndUser(c, project)
    return c.json(
      await publicFeed.getRoadmap(project.id, { locale: c.req.query('locale'), endUserId: eu?.id }),
    )
  })
  // The active survey to show this visitor (segment-aware, skips already-answered), or null.
  .get('/survey', async (c) => {
    const project = c.get('project')
    const eu = await resolveEndUser(c, project)
    return c.json(await surveys.getActiveSurvey(project.id, eu?.id))
  })
  .post('/survey/:id/responses', async (c) => {
    const project = c.get('project')
    const eu = await requireEndUser(c, project)
    const input = submitSurveyResponseInput.parse(await c.req.json())
    return c.json(await surveys.submitResponse(project.id, c.req.param('id'), eu.id, input), 201)
  })
  .get('/changelog', async (c) => c.json(await publicFeed.getPublicChangelog(c.get('project').id)))
  .post('/changelog/subscribe', async (c) => {
    const project = c.get('project')
    const eu = await resolveEndUser(c, project)
    const input = changelogSubscribeInput.parse(await c.req.json())
    return c.json(await publicFeed.subscribeChangelog(project.id, input.email, eu?.id), 201)
  })
  .post('/identify', async (c) => {
    const project = c.get('project')
    const { jwt } = identifyInput.parse(await c.req.json())
    let payload: Awaited<ReturnType<typeof verifyEndUserJwt>>
    try {
      payload = await verifyEndUserJwt(jwt, project.endUserJwtSecret)
    } catch {
      throw unauthorized('Invalid end-user token')
    }
    const endUser = await endUsers.upsertFromIdentity(project.id, payload)
    return c.json({ endUser, token: endUser.id })
  })
