/** Seeded admin credentials. The password becomes a real Better Auth credential via the
 *  api `seed:admin` script (Phase 2). Kept in its own module so it can be imported without
 *  executing the seed. */
export const SEED_ADMIN = {
  email: 'admin@heed.dev',
  password: 'heedadmin123',
  name: 'Acme Admin',
} as const
