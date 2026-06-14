import type { NextConfig } from 'next'

const config: NextConfig = {
  // Internal workspace packages export TS source — let Next transpile them.
  transpilePackages: ['@heed/core', '@heed/db', '@heed/config', '@heed/types'],
  outputFileTracingRoot: undefined,
  eslint: { ignoreDuringBuilds: true },
  // postgres.js / ioredis must stay server-only.
  serverExternalPackages: ['postgres', 'ioredis', 'better-auth', 'bullmq', 'stripe'],
}

export default config
