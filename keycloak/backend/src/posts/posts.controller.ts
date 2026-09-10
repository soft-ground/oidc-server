import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import type { KeycloakJwt } from '../auth/jwt.strategy';

@Controller('posts')
@UseGuards(JwtAuthGuard, RolesGuard) // order matters: authenticate then authorize
export class PostsController {
  @Get()
  findAll(@Req() req: { user: KeycloakJwt }) {
    // Any authenticated user. req.user holds the verified claims.
    return { user: req.user, items: [] };
  }

  @Post()
  @Roles('admin') // requires the admin role
  create() {
    return { ok: true };
  }
}
