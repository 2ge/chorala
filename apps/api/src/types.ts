import type { AuthContext, projects } from '@heed/core'

export type AppEnv = {
  Variables: {
    auth: AuthContext
  }
}

/** A project row resolved from its public key (the public/widget API surface). */
export type PublicProject = NonNullable<Awaited<ReturnType<typeof projects.getByPublicKey>>>

export type PublicEnv = {
  Variables: {
    project: PublicProject
  }
}
