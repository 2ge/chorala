import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { config as loadDotenv } from 'dotenv'
import { z } from 'zod'

/** Walk up from `start` to find the monorepo root (the dir holding pnpm-workspace.yaml). */
function findRepoRoot(start: string): string | null {
  let dir = start
  for (let i = 0; i < 10; i++) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

let dotenvLoaded = false
function ensureDotenv(): void {
  if (dotenvLoaded) return
  dotenvLoaded = true
  const root = findRepoRoot(process.cwd())
  loadDotenv(root ? { path: resolve(root, '.env'), quiet: true } : { quiet: true })
}

export const envSchema = z
  .object({
    // --- Deployment ---
    HEED_DEPLOYMENT: z.enum(['selfhost', 'cloud']).default('selfhost'),
    HEED_PUBLIC_URL: z.url().default('http://localhost:3000'),
    HEED_API_URL: z.url().default('http://localhost:8787'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // --- Database (required) ---
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    // --- Redis ---
    REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

    // --- Auth ---
    HEED_AUTH_SECRET: z.string().min(32, 'HEED_AUTH_SECRET must be at least 32 characters'),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // --- AI (optional; degrades to disabled) ---
    HEED_AI_PROVIDER: z.enum(['ollama', 'openai', 'anthropic', 'none']).default('ollama'),
    HEED_AI_BASE_URL: z.url().default('http://localhost:11434'),
    HEED_AI_API_KEY: z.string().optional(),
    HEED_AI_CHAT_MODEL: z.string().default('llama3.1:8b'),
    HEED_AI_EMBED_MODEL: z.string().default('nomic-embed-text'),
    HEED_AI_DEDUP_THRESHOLD: z.coerce.number().min(0).max(1).default(0.86),

    // --- Email (optional) ---
    HEED_EMAIL_TRANSPORT: z.enum(['smtp', 'resend', 'none']).default('smtp'),
    HEED_EMAIL_FROM: z.string().default('feedback@example.com'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),

    // --- Billing (cloud only) ---
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PRICE_STARTER: z.string().optional(),
    STRIPE_PRICE_PRO: z.string().optional(),

    // --- Widget / public API ---
    HEED_WIDGET_CDN_URL: z.url().default('http://localhost:8787/widget.js'),
    HEED_RATE_LIMIT_PUBLIC: z.coerce.number().int().positive().default(60),
  })
  .superRefine((val, ctx) => {
    if (
      (val.HEED_AI_PROVIDER === 'openai' || val.HEED_AI_PROVIDER === 'anthropic') &&
      !val.HEED_AI_API_KEY
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['HEED_AI_API_KEY'],
        message: `HEED_AI_API_KEY is required when HEED_AI_PROVIDER=${val.HEED_AI_PROVIDER}`,
      })
    }
  })

export type Env = z.infer<typeof envSchema>

let cached: Env | null = null

/** Validate process.env (loading the repo-root .env first). Throws a readable error on failure. */
export function loadEnv(): Env {
  if (cached) return cached
  ensureDotenv()
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n')
    throw new Error(
      `\n✗ Invalid environment configuration:\n${issues}\n\nFix your .env (see .env.example for the full list).\n`,
    )
  }
  cached = parsed.data
  return cached
}

/** Reset the validation cache — used by tests. */
export function resetEnvCache(): void {
  cached = null
  dotenvLoaded = false
}

/** Lazily-validated env singleton. Access a key to trigger validation on first use. */
export const env: Env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return loadEnv()[prop as keyof Env]
  },
  has(_target, prop: string) {
    return prop in loadEnv()
  },
})
