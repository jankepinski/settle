import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users/me
   *
   * Return the currently authenticated user's profile.
   * Protected by JwtAuthGuard — requires a valid access token.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: any) {
    const { id } = req.user as { id: string };
    const user = await this.usersService.findById(id);
    if (!user) {
      return null;
    }
    // Don't leak the password hash to the client
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
