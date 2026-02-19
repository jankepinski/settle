import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * LocalAuthGuard — used only on the login endpoint.
 *
 * Usage:  @UseGuards(LocalAuthGuard)
 *
 * Under the hood it triggers the LocalStrategy registered as 'local'.
 * It reads email + password from the request body, validates them, and
 * populates req.user with the authenticated user.
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
