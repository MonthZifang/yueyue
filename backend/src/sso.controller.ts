import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { SsoService } from './sso.service';
import { getSsoConfig, loadAppConfig } from './config';

@Controller('auth/sso')
export class SsoController {
  constructor(private readonly sso: SsoService) {}

  @Get('status')
  status() {
    const sso = getSsoConfig();
    return {
      enabled: this.sso.isEnabled(),
      issuer: sso.issuer,
      redirectUri: sso.redirectUri,
      postLoginRedirect: sso.postLoginRedirect,
    };
  }

  @Get('login')
  login(
    @Query('returnTo') returnTo: string,
    @Res({ passthrough: true }) res: Response,
    @Req() req: { headers: { host?: string } },
  ) {
    const { url, state, returnTo: to } = this.sso.beginLogin(returnTo || '/');
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
    // 方便排查：把实际使用的 redirect_uri 一并返回
    return { url, redirectUri: getSsoConfig().redirectUri };
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.sso.callback(code ?? '', state ?? '');
    const returnPath =
      (res.req.cookies?.sso_return as string | undefined) || '/';
    const app = loadAppConfig();
    const target = new URL(
      app.sso.postLoginRedirect || `${app.site.origin}/auth/sso/callback`,
    );
    target.searchParams.set('token', result.token);
    target.searchParams.set('username', result.user.username);
    target.searchParams.set('returnTo', returnPath);
    res.clearCookie('sso_state');
    res.clearCookie('sso_return');
    res.redirect(target.toString());
  }
}
