/** Tiny HTTP client for the Chorala admin API, authenticated with an `hk_...` API key.
 *  Kept dependency-free so this MIT package never imports the AGPL server code. */
export type HeedClientConfig = { apiUrl: string; apiKey: string }

export function createClient(cfg: HeedClientConfig) {
  const base = `${cfg.apiUrl.replace(/\/+$/, '')}/api/v1`
  const baseHeaders = {
    authorization: `Bearer ${cfg.apiKey}`,
    'content-type': 'application/json',
  }
  let projectId: string | null = null

  async function req<T = unknown>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(base + path, {
      ...init,
      headers: { ...baseHeaders, ...(init?.headers ?? {}) },
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`Chorala API ${res.status} on ${path}: ${detail.slice(0, 200)}`)
    }
    return (res.status === 204 ? null : await res.json()) as T
  }

  /** The api key is scoped to one project; resolve and cache its id. */
  async function getProjectId(): Promise<string> {
    if (projectId) return projectId
    const projects = await req<{ id: string }[]>('/projects')
    const id = projects[0]?.id
    if (!id) throw new Error('This API key resolves to no project.')
    projectId = id
    return id
  }

  return { req, getProjectId }
}

export type HeedClient = ReturnType<typeof createClient>
