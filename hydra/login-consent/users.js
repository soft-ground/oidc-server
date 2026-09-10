// Minimal in-memory user store. In Hydra, the identity store is entirely your
// responsibility (or Ory Kratos) — this mirrors Keycloak's seeded alice/bob.
export const users = {
  alice: {
    sub: 'alice',
    password: 'password',
    email: 'alice@example.com',
    name: 'Alice Admin',
    roles: ['admin', 'user'],
    permissions: ['read:posts', 'write:posts', 'delete:posts'],
  },
  bob: {
    sub: 'bob',
    password: 'password',
    email: 'bob@example.com',
    name: 'Bob User',
    roles: ['user'],
    permissions: ['read:posts'],
  },
};

export function verify(username, password) {
  const u = users[username];
  if (u && u.password === password) return u;
  return null;
}

export function findBySub(sub) {
  return Object.values(users).find((u) => u.sub === sub) ?? null;
}
