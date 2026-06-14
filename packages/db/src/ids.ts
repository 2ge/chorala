import { createHash, randomBytes } from 'node:crypto'
import { API_KEY_PREFIX, ID_PREFIXES, type IdEntity, PUBLIC_KEY_PREFIX } from '@heed/config'
import { customAlphabet } from 'nanoid'

// URL-safe, unambiguous-ish alphabet (no _ or - so ids stay double-click selectable).
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const nano = customAlphabet(ALPHABET, 21)
const nano32 = customAlphabet(ALPHABET, 32)
const nano40 = customAlphabet(ALPHABET, 40)

/** Generate a prefixed nanoid for an entity, e.g. `newId('post') → "post_V1Stgx..."`. */
export function newId(entity: IdEntity): string {
  return `${ID_PREFIXES[entity]}_${nano()}`
}

/** A project's public, embeddable key (`pk_...`). */
export function generatePublicKey(): string {
  return `${PUBLIC_KEY_PREFIX}_${nano32()}`
}

/** Hash an API key for at-rest storage (we never store the raw key). */
export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

/** Mint an admin API key (`hk_...`). Returns the raw key (shown once), its prefix, and the hash to store. */
export function generateApiKey(): { key: string; prefix: string; hashedKey: string } {
  const key = `${API_KEY_PREFIX}_${nano40()}`
  return { key, prefix: key.slice(0, 11), hashedKey: hashApiKey(key) }
}

/** A random secret (e.g. project end-user JWT secret, webhook signing secret). */
export function generateSecret(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}
