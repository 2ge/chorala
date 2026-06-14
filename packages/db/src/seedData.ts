/** Seeded admin credentials. The password becomes a real Better Auth credential via the
 *  api `seed:admin` script (Phase 2). Kept in its own module so it can be imported without
 *  executing the seed. */
export const SEED_ADMIN = {
  email: 'admin@chorala.com',
  password: 'choraladmin123',
  name: 'Acme Admin',
} as const
