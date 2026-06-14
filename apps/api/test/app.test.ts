import { expect, test } from 'vitest'
import { createApp } from '../src/app.ts'

const app = createApp()

test('GET /health is public and reports the service', async () => {
  const res = await app.request('/health')
  expect(res.status).toBe(200)
  const body = (await res.json()) as { ok: boolean; service: string }
  expect(body.ok).toBe(true)
  expect(body.service).toBe('heed-api')
})

test('GET /widget.js serves the stub as JavaScript', async () => {
  const res = await app.request('/widget.js')
  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toContain('javascript')
})

test('admin API rejects unauthenticated requests with 401', async () => {
  const res = await app.request('/api/v1/projects')
  expect(res.status).toBe(401)
  const body = (await res.json()) as { error: { code: string } }
  expect(body.error.code).toBe('unauthorized')
})

test('unknown public route returns the JSON not_found contract', async () => {
  const res = await app.request('/nope')
  expect(res.status).toBe(404)
  const body = (await res.json()) as { error: { code: string } }
  expect(body.error.code).toBe('not_found')
})
