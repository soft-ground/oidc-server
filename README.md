# oidc-server — OIDC provider comparison (Keycloak vs Ory Hydra)

A hands-on comparison of two open-source OIDC providers, each self-contained and
runnable on its own, consumed by the same style of NestJS backend + Next.js
frontend.

```
oidc-server/
├─ keycloak/     # all-in-one IdP: user store + login + consent + token issuance
│  └─ README.md
└─ hydra/        # OAuth2/OIDC token engine only; bring your own login+consent+users
   └─ README.md
```

## The core architectural difference

| | Keycloak | Ory Hydra |
|---|---|---|
| Scope | Full IdP (users, login UI, consent, tokens, admin) | OAuth2/OIDC **token engine only** |
| Login / consent UI | Built in | **You build it** (login & consent apps handling Hydra's challenge flow) |
| User store | Built in | **External** (your app, or Ory Kratos) |
| Roles / custom claims | Realm/client roles + protocol mappers | Injected by **your consent app** into the token session |
| Signing | RS256 (JWKS) | RS256 (JWKS) |
| Admin surface | Web console + REST | REST admin API (no UI) |

Both issue standard RS256 JWTs verifiable via a JWKS endpoint, so the resource
server (NestJS) verifies tokens the same way against either provider — the
difference is entirely on the authorization-server side.

## Run

Each provider folder is independent. See its README:

- [keycloak/README.md](keycloak/README.md)
- [hydra/README.md](hydra/README.md)

Ports are chosen to not collide across the two stacks (Keycloak 24080 / Hydra
4444–4445, plus their own DBs and apps).
