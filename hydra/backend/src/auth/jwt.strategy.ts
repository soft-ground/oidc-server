import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

// Hydra JWT access tokens carry standard claims plus whatever the consent app
// injected via `session.access_token`. Some Hydra versions nest custom claims
// under `ext`, so we read both shapes.
interface HydraJwt {
  sub: string;
  preferred_username?: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
  // Hydra nests the consent app's session.access_token claims under `ext`.
  ext?: {
    preferred_username?: string;
    email?: string;
    roles?: string[];
    permissions?: string[];
    [k: string]: unknown;
  };
}

export interface OidcUser {
  sub: string;
  preferred_username?: string;
  email?: string;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['RS256'], // asymmetric signatures only
      // Resolve the public key by `kid` from JWKS, with caching.
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri: process.env.OIDC_JWKS_URI!,
      }),
      issuer: process.env.OIDC_ISSUER,
    });
  }

  // Validated payload becomes req.user.
  async validate(payload: HydraJwt): Promise<OidcUser> {
    const ext = payload.ext ?? {};
    return {
      sub: payload.sub,
      preferred_username: payload.preferred_username ?? ext.preferred_username,
      email: payload.email ?? ext.email,
      roles: payload.roles ?? ext.roles ?? [],
      permissions: payload.permissions ?? ext.permissions ?? [],
    };
  }
}
