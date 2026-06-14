import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Guard: the old build-time codename must not appear ANYWHERE in shipped source.
// This is the automated "double check there is no old name" — if anyone reintroduces
// it, `pnpm test` fails. The token is built from char codes so this file itself stays
// clean and is excluded along with all test/spec files (which may assert its absence).
const LEGACY = new RegExp(String.fromCharCode(104, 101, 101, 100), 'i') // /heed/i

const repoRoot = resolve(process.cwd(), '../..')

const SKIP_EXT = /\.(png|jpe?g|gif|ico|webp|woff2?|ttf|pdf|lock)$/i
const SKIP_PATH = /(^|\/)(test|tests|e2e)\/|\.(test|spec)\.[cm]?[jt]sx?$|pnpm-lock\.yaml$/

function trackedFiles(): string[] {
  return execSync('git ls-files', { cwd: repoRoot, encoding: 'utf8' })
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean)
    .filter((f) => !SKIP_EXT.test(f) && !SKIP_PATH.test(f))
}

describe('no legacy brand name in source', () => {
  it('every tracked non-test file is free of the old codename', () => {
    const offenders: string[] = []
    for (const file of trackedFiles()) {
      let content: string
      try {
        content = readFileSync(resolve(repoRoot, file), 'utf8')
      } catch {
        continue // deleted/unreadable — skip
      }
      content.split('\n').forEach((line, i) => {
        if (LEGACY.test(line)) offenders.push(`${file}:${i + 1}  ${line.trim().slice(0, 80)}`)
      })
    }
    expect(offenders, `legacy brand token found:\n${offenders.join('\n')}`).toEqual([])
  })
})
