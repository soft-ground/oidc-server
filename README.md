# oidc-server — Keycloak OIDC Single Sign-On

Keycloak-based (RS256) OIDC authentication server with a NestJS backend (token
verification) and a Next.js frontend (login flow) scaffold.

## Layout

```
oidc-server/
├─ docker-compose.yml            # Keycloak 26 + Postgres (realm auto-import)
├─ keycloak/import/
│  └─ myapp-realm.json           # Realm/Client/Mapper/Role/User auto-provisioning
├─ backend/                      # NestJS: JWKS signature verification + RBAC
│  ├─ .env.example
│  └─ src/
│     ├─ auth/{jwt.strategy,jwt-auth.guard,roles.decorator,roles.guard,auth.module}.ts
│     └─ posts/posts.controller.ts
└─ frontend/                     # Next.js (App Router): NextAuth Keycloak provider
   ├─ .env.local.example
   ├─ auth.ts
   ├─ lib/api.ts
   └─ app/
      ├─ api/auth/[...nextauth]/route.ts
      └─ components/AuthButtons.tsx
```

## 1. Start Keycloak

```bash
docker compose up -d
```

- Console: http://localhost:24080  (admin / admin)
- `--import-realm` provisions the `myapp` realm automatically.
- Seed accounts: `alice` (admin, user) / `bob` (user) — password `password`
- JWKS: http://localhost:24080/realms/myapp/protocol/openid-connect/certs

### Ports

| Service  | Host port | Notes |
|----------|-----------|-------|
| Keycloak | **24080** | maps to container 8080 |
| Postgres | **25432** | maps to container 5432, for direct DB access |
| Next.js  | **24030** | `next dev -p 24030` |
| NestJS   | **24041** | `.env` PORT |

> To change a port, update `ports` in `docker-compose.yml`, both `.env` files,
> and the redirect/webOrigins entries in `keycloak/import/myapp-realm.json`.

> To configure the realm manually instead of importing, add `roles` (User Realm
> Role) and `permissions` (User Attribute) mappers to the access token via
> Realm → Client → Client scopes → dedicated scope → Mappers.

## 2. Backend (NestJS)

```bash
cd backend
cp .env.example .env
npm install
npm run start:dev            # http://localhost:24041
```

`AuthModule` is wired into `AppModule`; `PostsController` shows
`@UseGuards(JwtAuthGuard, RolesGuard)` with a `@Roles('admin')` route.

## 3. Frontend (Next.js)

```bash
cd frontend
cp .env.local.example .env.local   # set AUTH_SECRET: openssl rand -base64 32
npm install
npm run dev                        # http://localhost:24030
```

Login flow: `signIn('keycloak')` → Keycloak (Authorization Code + PKCE) →
callback exchanges the code for tokens → stored in an httpOnly session. API
calls attach the token server-side (BFF pattern), see `lib/api.ts`.

The seed users log in with password `password`: `alice` (admin) can POST
`/posts`; `bob` (user) gets 403 on POST but 200 on GET.

> This is a public client, so NextAuth performs the token exchange with PKCE and
> no client secret (`token_endpoint_auth_method: 'none'`). For a confidential
> client, set it to `client_secret_post` and provide `KEYCLOAK_CLIENT_SECRET`.

## Production checklist
- `docker-compose.yml`: `start-dev` → `start`, set `KC_HOSTNAME` /
  `KC_PROXY_HEADERS`, terminate TLS at a reverse proxy.
- Inject the Postgres password / secrets externally; remove seed users.
- Point the frontend/backend URLs at production domains.
