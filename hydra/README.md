# Ory Hydra OIDC stack

Hydra is an OAuth2/OIDC **token engine** — it does not ship a login screen,
consent screen, or user store. This stack supplies those:

```
hydra/
├─ docker-compose.yml     # Hydra + Postgres + migration + login-consent app
├─ login-consent/         # Node/Express: login UI, consent, claim injection,
│  ├─ server.js           #   and OAuth2 client auto-provisioning
│  └─ users.js            #   in-memory alice/bob (roles + permissions)
├─ backend/               # NestJS resource server (JWKS verify, provider-neutral)
└─ frontend/              # Next.js + NextAuth generic OIDC provider
```

## How it maps to Keycloak

| Concern | Keycloak | Here (Hydra) |
|---|---|---|
| Users | Realm users | `login-consent/users.js` |
| Login UI | Built in | `login-consent` `/login` |
| Consent | Built in | `login-consent` `/consent` (auto-grant, first-party) |
| Roles/permissions in JWT | Protocol mappers | Injected in the **consent accept** (`session.access_token`) |
| Client registration | Admin console / realm import | Auto-created by `login-consent` on boot |
| JWT signing | RS256 (JWKS) | RS256 (JWKS), `STRATEGIES_ACCESS_TOKEN=jwt` |

> Hydra access tokens are **opaque by default**; this stack sets
> `STRATEGIES_ACCESS_TOKEN=jwt` so the resource server can verify them via JWKS,
> exactly like the Keycloak stack.

## 1. Start Hydra

```bash
docker compose up -d --build
```

- Public (OAuth2/OIDC): http://localhost:4444 (issuer)
- Admin API: http://localhost:4445
- login-consent app: http://localhost:24071
- Discovery: http://localhost:4444/.well-known/openid-configuration
- JWKS: http://localhost:4444/.well-known/jwks.json
- Seed users: `alice` (admin, user) / `bob` (user) — password `password`

The `login-consent` app auto-provisions the `hydra-web` OAuth2 client on boot
(public client, PKCE, redirect `http://localhost:24031/api/auth/callback/hydra`).

### Ports

| Service | Host port |
|---|---|
| Hydra public | 4444 |
| Hydra admin | 4445 |
| Postgres | 25433 |
| login-consent | 24071 |
| NestJS backend | 24042 |
| Next.js frontend | 24031 |

## 2. Backend (NestJS)

```bash
cd backend
cp .env.example .env
npm install
npm run start:dev            # http://localhost:24042
```

Same guards as the Keycloak backend; `jwt.strategy.ts` reads `roles`/
`permissions` from the token (with an `ext.*` fallback for Hydra's claim shape).

## 3. Frontend (Next.js)

```bash
cd frontend
cp .env.local.example .env.local   # set AUTH_SECRET: openssl rand -base64 32
npm install
npm run dev                        # http://localhost:24031
```

Login flow: `signIn('hydra')` → Hydra `/oauth2/auth` → redirects to the
`login-consent` app for login + consent → code (PKCE) exchanged for tokens →
httpOnly session. Logout uses Hydra RP-initiated logout
(`/oauth2/sessions/logout`).

## Quick token check (no frontend)

After `docker compose up`, drive the full Authorization Code + PKCE flow and
inspect the JWT to confirm `roles`/`permissions` are present. The simplest path
is to log in through the frontend and read the backend `GET /posts` response,
which echoes the verified claims.
