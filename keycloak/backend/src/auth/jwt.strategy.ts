import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

export interface KeycloakJwt {
  sub: string;
  preferred_username?: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
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
        jwksUri: process.env.KEYCLOAK_JWKS_URI!,
      }),
      issuer: process.env.KEYCLOAK_ISSUER,
      // audience: process.env.KEYCLOAK_AUDIENCE, // enable to validate `aud`
    });
  }

  // Validated payload becomes req.user.
  async validate(payload: KeycloakJwt): Promise<KeycloakJwt> {
    return {
      sub: payload.sub,
      preferred_username: payload.preferred_username,
      email: payload.email,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
    };
  }
}
