import { Body, Controller, ForbiddenException, Get, Post, Req, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @MinLength(4)
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** 本地密码登录已停用：统一 SSO。 */
  @Post('login')
  login() {
    throw new ForbiddenException('本地登录已停用，请使用 SSO 统一登录');
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: { user: { sub: number } }) {
    return this.auth.me(req.user.sub);
  }

  @Post('sync-avatars')
  @UseGuards(AuthGuard)
  async syncAvatars() {
    // 需要 root：复用 AuthService 注入 SsoService 不方便，直接调用服务
    return this.auth.syncAvatars();
  }

  @Get('access')
  @UseGuards(AuthGuard)
  async access(@Req() req: { user: { sub: number } }) {
    const user = await this.auth.me(req.user.sub);
    return {
      canAdmin: Boolean(user.isRoot),
      isRoot: Boolean(user.isRoot),
      user,
    };
  }
}
