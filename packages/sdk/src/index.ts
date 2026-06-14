import createClient, { type Client } from 'openapi-fetch'
import type { paths } from './schema.gen.ts'

export type ChoralaClientOptions = {
  /** API base, e.g. `https://chorala.com/api/v1` (default). */
  baseUrl?: string
  /** Project public key `pk_…` — for public/widget endpoints. */
  publicKey?: string
  /** Admin API key `hk_…` — for admin/management endpoints. */
  apiKey?: string
  /** Host-signed end-user JWT (SSO) — attributes public writes to your user. */
  endUserToken?: string
}

/**
 * Fully-typed Chorala API client (paths/params/bodies/responses inferred from the
 * OpenAPI spec). Thin wrapper over `openapi-fetch`.
 *
 * ```ts
 * const chorala = createChoralaClient({ publicKey: 'pk_live_xxx' })
 * const { data } = await chorala.GET('/public/boards', { params: { query: { sort: 'top' } } })
 * await chorala.POST('/public/posts', { body: { boardSlug: 'feature-requests', title: 'Dark mode' } })
 * ```
 */
export function createChoralaClient(opts: ChoralaClientOptions = {}): Client<paths> {
  const { baseUrl = 'https://chorala.com/api/v1', publicKey, apiKey, endUserToken } = opts
  const headers: Record<string, string> = {}
  if (publicKey) headers['X-Chorala-Key'] = publicKey
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`
  if (endUserToken) headers['X-Chorala-User'] = endUserToken
  return createClient<paths>({ baseUrl, headers })
}

export type { paths } from './schema.gen.ts'
export default createChoralaClient
