export * from './constants.ts'
export { type Env, env, envSchema, loadEnv, resetEnvCache } from './env.ts'

import { loadEnv } from './env.ts'

/** Deployment-mode helpers (validate env on first call). */
export const isCloud = (): boolean => loadEnv().HEED_DEPLOYMENT === 'cloud'
export const isSelfhost = (): boolean => loadEnv().HEED_DEPLOYMENT === 'selfhost'
export const isProduction = (): boolean => loadEnv().NODE_ENV === 'production'
export const isDevelopment = (): boolean => loadEnv().NODE_ENV === 'development'

/** Feature-availability helpers for graceful degradation (SPEC §2). */
export const isAiEnabled = (): boolean => loadEnv().HEED_AI_PROVIDER !== 'none'
export const isEmailEnabled = (): boolean => loadEnv().HEED_EMAIL_TRANSPORT !== 'none'
