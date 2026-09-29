import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { SsoService } from './sso.service';

@Controller('auth/sso')
export class SsoController {
  constructor(private readonly sso: SsoService) {}

  @Get('status')
  status() {
    return { enabled: this.sso.isEnabled() };
  }

  @Get('login')
  login(
    @Query('returnTo') returnTo: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { url, state, returnTo: to } = this.sso.beginLogin(returnTo || '/admin');
    // 便于前端回跳后校验；HttpOnly 简化开发环境
    res.cookie('sso_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
    });
    res.cookie('sso_return', to, {
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
    });
    return { url };
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.sso.callback(code ?? '', state ?? '');
    // 把 token 交给前端 SPA：302 到前端回调页，token 放在 fragment 避免进日志
    const returnPath =
      (res.req.cookies?.sso_return as string | undefined) || '/admin';
    const target = new URL(
      process.env.SSO_POST_LOGIN_REDIRECT ||
        'https://mindustry.wiki:1081/auth/sso/callback',
    );
    target.searchParams.set('token', result.token);
    target.searchParams.set('username', result.user.username);
    target.searchParams.set('returnTo', returnPath);
    res.clearCookie('sso_state');
    res.clearCookie('sso_return');
    res.redirect(target.toString());
  }
}
