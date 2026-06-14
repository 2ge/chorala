import { env } from '@heed/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.ts'

/** Low-level postgres.js client. Reused across the process (pooled). */
export const client = postgres(env.DATABASE_URL, { max: 10 })

/** The Drizzle database handle, schema-aware (enables `db.query.*`). */
export const db = drizzle(client, { schema })

export { schema }
export type Database = typeof db
