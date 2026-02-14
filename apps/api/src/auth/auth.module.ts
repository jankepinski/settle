import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    // UsersModule exports UsersService which we need in AuthService and
    // JwtStrategy.
    UsersModule,

    // PassportModule registers Passport with NestJS. It's the glue between
    // Passport strategies and NestJS guards.
    PassportModule,

    // JwtModule provides JwtService for signing and verifying tokens.
    // We don't set defaults here — secrets and expiration are passed
    // explicitly in AuthService for clarity (access vs refresh have
    // different secrets).
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
