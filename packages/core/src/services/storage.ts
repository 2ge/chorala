import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { env } from '@chorala/config'
import { and, attachments, db, eq, inArray, isNull, newId, sql } from '@chorala/db'
import type { CreateAttachmentInput } from '@chorala/types'
import type { AuthContext } from '../context.ts'
import { badRequest, notFound } from '../errors.ts'
import { getProject } from './projects.ts'

const DATA_URL_RE = /^data:([^;,]+)(;base64)?,(.*)$/s
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

/** Decode a `data:<mime>;base64,<payload>` URL into a typed buffer; reject anything unexpected. */
function decodeDataUrl(dataUrl: string): { mimeType: string; bytes: Buffer } {
  const m = DATA_URL_RE.exec(dataUrl)
  if (!m) throw badRequest('Malformed data URL')
  const [, rawMime, base64Flag, payload = ''] = m
  const mimeType = (rawMime ?? '').toLowerCase()
  if (!ALLOWED_MIME.has(mimeType)) throw badRequest(`Unsupported attachment type: ${mimeType}`)
  const bytes = base64Flag
    ? Buffer.from(payload, 'base64')
    : Buffer.from(decodeURIComponent(payload), 'utf8')
  if (bytes.byteLength === 0) throw badRequest('Empty attachment')
  return { mimeType, bytes }
}

/** Best-effort intrinsic dimensions from the file header (PNG only; null otherwise). */
function pngDimensions(bytes: Buffer): { width: number | null; height: number | null } {
  // PNG signature + IHDR: width @ byte 16, height @ byte 20 (big-endian).
  if (bytes.length >= 24 && bytes.toString('ascii', 1, 4) === 'PNG') {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
  }
  return { width: null, height: null }
}

function uploadRoot() {
  return resolve(env.CHORALA_UPLOAD_DIR)
}

/** Sum of stored attachment bytes for a project — the figure the per-project quota guards. */
export async function projectStorageUsage(projectId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${attachments.byteSize}), 0)::bigint` })
    .from(attachments)
    .where(eq(attachments.projectId, projectId))
  return Number(row?.total ?? 0)
}

/**
 * Store an uploaded attachment (public, end-user-authenticated). Bytes go to disk; a metadata
 * row is inserted unlinked (post_id null) and linked when the post is created. Enforces a
 * per-file ceiling and a per-project storage quota so a project can't be used as free storage.
 */
export async function createPublicAttachment(
  projectId: string,
  endUserId: string,
  input: CreateAttachmentInput,
) {
  const { mimeType, bytes } = decodeDataUrl(input.dataUrl)
  const byteSize = bytes.byteLength
  if (byteSize > env.CHORALA_ATTACHMENT_MAX_BYTES) {
    throw badRequest(`Attachment exceeds the ${env.CHORALA_ATTACHMENT_MAX_BYTES}-byte limit`)
  }
  if ((await projectStorageUsage(projectId)) + byteSize > env.CHORALA_ATTACHMENT_QUOTA_BYTES) {
    throw badRequest('Project attachment storage quota exceeded')
  }

  const id = newId('attachment')
  const storageKey = join(projectId, id)
  const dir = join(uploadRoot(), projectId)
  await mkdir(dir, { recursive: true })
  await writeFile(join(uploadRoot(), storageKey), bytes)

  const { width, height } = pngDimensions(bytes)
  const [row] = await db
    .insert(attachments)
    .values({
      id,
      projectId,
      endUserId,
      kind: input.kind,
      mimeType,
      byteSize,
      width,
      height,
      storageKey,
    })
    .returning({
      id: attachments.id,
      kind: attachments.kind,
      mimeType: attachments.mimeType,
      byteSize: attachments.byteSize,
      width: attachments.width,
      height: attachments.height,
    })
  if (!row) throw badRequest('Failed to store attachment')
  return row
}

/**
 * Link freshly-uploaded, still-unlinked attachments to a post on creation. Scoped to the same
 * project (and end-user when known) so one tenant can't attach another's orphaned uploads.
 */
export async function linkAttachmentsToPost(
  projectId: string,
  endUserId: string | null,
  attachmentIds: string[],
  postId: string,
) {
  if (attachmentIds.length === 0) return
  const ownership = endUserId ? eq(attachments.endUserId, endUserId) : sql`true`
  await db
    .update(attachments)
    .set({ postId })
    .where(
      and(
        inArray(attachments.id, attachmentIds),
        eq(attachments.projectId, projectId),
        isNull(attachments.postId),
        ownership,
      ),
    )
}

const attachmentColumns = {
  id: attachments.id,
  projectId: attachments.projectId,
  postId: attachments.postId,
  kind: attachments.kind,
  mimeType: attachments.mimeType,
  byteSize: attachments.byteSize,
  width: attachments.width,
  height: attachments.height,
  createdAt: attachments.createdAt,
  updatedAt: attachments.updatedAt,
}

/** Attachment metadata for a post (admin) — never includes the raw bytes. */
export async function listAttachmentsForPost(ctx: AuthContext, projectId: string, postId: string) {
  await getProject(ctx, projectId)
  return db
    .select(attachmentColumns)
    .from(attachments)
    .where(and(eq(attachments.projectId, projectId), eq(attachments.postId, postId)))
}

/** Read an attachment's bytes for admin display (the dashboard streams these). */
export async function readAttachment(ctx: AuthContext, projectId: string, id: string) {
  await getProject(ctx, projectId)
  const [row] = await db
    .select({ mimeType: attachments.mimeType, storageKey: attachments.storageKey })
    .from(attachments)
    .where(and(eq(attachments.id, id), eq(attachments.projectId, projectId)))
  if (!row) throw notFound('Attachment')
  const bytes = await readFile(join(uploadRoot(), row.storageKey))
  return { mimeType: row.mimeType, bytes }
}
