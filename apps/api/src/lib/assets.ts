import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url)) // apps/api/src/lib
const repoRoot = resolve(here, '../../../..')

export const WIDGET_JS = resolve(repoRoot, 'packages/widget/dist/widget.js')
export const WIDGET_MAP = resolve(repoRoot, 'packages/widget/dist/widget.js.map')
export const DEMO_HTML = resolve(repoRoot, 'apps/dashboard/public/widget-demo.html')

export function readFileSafe(path: string): string | null {
  return existsSync(path) ? readFileSync(path, 'utf8') : null
}
