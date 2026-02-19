import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard — protects endpoints that require a valid access token.
 *
 * Usage:  @UseGuards(JwtAuthGuard)
 *
 * Under the hood it triggers the JwtStrategy registered as 'jwt'.
 * If the token is missing, expired, or invalid → automatic 401.
 * If valid → req.user is populated with the object from JwtStrategy.validate().
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
