import { storage } from '@chorala/core'
import type { NextRequest } from 'next/server'
import { requireAuthContext } from '@/lib/session'

/**
 * Streams an attachment's bytes for the admin UI. Auth'd via the dashboard session (so the
 * shared on-disk store is never publicly reachable); `projectId` scopes the lookup. Used as
 * the `src` of <img> tags on the post-detail page.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) return new Response('projectId required', { status: 400 })

  const ctx = await requireAuthContext()
  try {
    const { mimeType, bytes } = await storage.readAttachment(ctx, projectId, id)
    return new Response(new Uint8Array(bytes), {
      headers: {
        'content-type': mimeType,
        'cache-control': 'private, max-age=300',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
