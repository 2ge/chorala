import { AppError } from '@heed/core'
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'

/** Maps thrown errors to the JSON contract `{ error: { code, message, details? } }`. */
export function onError(err: Error, c: Context): Response {
  if (err instanceof AppError) {
    return c.json(
      { error: { code: err.code, message: err.message, details: err.details } },
      err.status as 400,
    )
  }
  if (err instanceof ZodError) {
    return c.json(
      { error: { code: 'validation_error', message: 'Invalid request', details: err.issues } },
      400,
    )
  }
  if (err instanceof HTTPException) {
    return c.json({ error: { code: 'http_error', message: err.message } }, err.status)
  }
  console.error('[api] unhandled error:', err)
  return c.json({ error: { code: 'internal_error', message: 'Internal server error' } }, 500)
}

export function notFoundHandler(c: Context): Response {
  return c.json({ error: { code: 'not_found', message: 'Route not found' } }, 404)
}
