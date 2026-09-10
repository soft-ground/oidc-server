import bcrypt from 'bcryptjs';

// Minimal in-memory user store. In Hydra, the identity store is entirely your
// responsibility (or Ory Kratos) — this mirrors Keycloak's seeded alice/bob.
// Passwords are stored ONLY as bcrypt hashes, never in plaintext. The hashes
// below are bcrypt("password"); replace with a real DB / Ory Kratos in production.
export const users = {
  alice: {
    sub: 'alice',
    passwordHash: '$2a$10$pd/shC6Gtydby4HXjY3L4eSGCEj9mc/xiyAn0KO3.7M673QyU4gMC',
    email: 'alice@example.com',
    name: 'Alice Admin',
    roles: ['admin', 'user'],
    permissions: ['read:posts', 'write:posts', 'delete:posts'],
  },
  bob: {
    sub: 'bob',
    passwordHash: '$2a$10$RkmJDmc2UODbH6G0VfjFceb5XiA.5NeFN4UR8GpDHDq5GexjyUVQW',
    email: 'bob@example.com',
    name: 'Bob User',
    roles: ['user'],
    permissions: ['read:posts'],
  },
};

export async function verify(username, password) {
  const u = users[username];
  if (!u) {
    // Compare against a dummy hash to keep timing roughly constant and avoid
    // leaking which usernames exist.
    await bcrypt.compare(password, '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin');
    return null;
  }
  const ok = await bcrypt.compare(password, u.passwordHash);
  return ok ? u : null;
}

export function findBySub(sub) {
  return Object.values(users).find((u) => u.sub === sub) ?? null;
}
