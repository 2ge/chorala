import type {
  BoardsResponse,
  ChangelogEntry,
  Comment,
  PostDetail,
  RoadmapResponse,
} from './types.ts'

export type ApiConfig = { apiBase: string; projectKey: string; jwt?: string }

export type Api = ReturnType<typeof createApi>

export function createApi(cfg: ApiConfig) {
  const base = cfg.apiBase.replace(/\/+$/, '')

  function headers(json = false): Record<string, string> {
    const h: Record<string, string> = { 'x-heed-key': cfg.projectKey }
    if (json) h['content-type'] = 'application/json'
    if (cfg.jwt) h['x-heed-user'] = cfg.jwt
    return h
  }

  async function req<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(base + path, { credentials: 'include', ...init })
    if (!res.ok) {
      let message = `Request failed (${res.status})`
      try {
        const err = (await res.json()) as { error?: { message?: string } }
        if (err.error?.message) message = err.error.message
      } catch {
        /* ignore */
      }
      throw new Error(message)
    }
    return res.status === 204 ? (null as T) : ((await res.json()) as T)
  }

  const qs = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v)
    const s = sp.toString()
    return s ? `?${s}` : ''
  }

  return {
    listBoards: (locale?: string, boardSlug?: string, sort?: string) =>
      req<BoardsResponse>(`/public/boards${qs({ locale, boardSlug, sort })}`, {
        headers: headers(),
      }),
    getPost: (id: string, locale?: string) =>
      req<PostDetail>(`/public/posts/${id}${qs({ locale })}`, { headers: headers() }),
    createPost: (body: { boardSlug: string; title: string; body: string; locale?: string }) =>
      req<PostDetail>('/public/posts', {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify(body),
      }),
    vote: (id: string, on: boolean) =>
      req<{ voted: boolean; voteCount: number }>(`/public/posts/${id}/vote`, {
        method: on ? 'POST' : 'DELETE',
        headers: headers(),
      }),
    comment: (id: string, body: string) =>
      req<Comment>(`/public/posts/${id}/comments`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({ body }),
      }),
    roadmap: (locale?: string) =>
      req<RoadmapResponse>(`/public/roadmap${qs({ locale })}`, { headers: headers() }),
    changelog: () => req<ChangelogEntry[]>('/public/changelog', { headers: headers() }),
  }
}
