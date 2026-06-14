import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import { env } from '@heed/config'

let key: Buffer | null = null
function getKey(): Buffer {
  if (!key) key = scryptSync(env.HEED_AUTH_SECRET, 'heed-integrations', 32)
  return key
}

/** AES-256-GCM encrypt a secret for at-rest storage (SPEC §13). Output: `v1:<base64(iv|tag|ct)>`. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${Buffer.concat([iv, tag, ct]).toString('base64')}`
}

export function decryptSecret(enc: string): string {
  const raw = Buffer.from(enc.replace(/^v1:/, ''), 'base64')
  const iv = raw.subarray(0, 12)
  const tag = raw.subarray(12, 28)
  const ct = raw.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}
