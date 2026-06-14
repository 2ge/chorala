import { badRequest } from '@heed/core'
import type { Context } from 'hono'

/** Read a required route param. Parent-mounted params type as `string | undefined`; this
 *  narrows to `string` and fails loudly (400) if it is genuinely absent. */
export function reqParam(c: Context, name: string): string {
  const value = c.req.param(name)
  if (value === undefined) throw badRequest(`Missing route parameter: ${name}`)
  return value
}
