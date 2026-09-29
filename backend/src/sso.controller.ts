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
    const started = this.sso.beginLogin(returnTo || '/');
    const secure = started.redirectUri.startsWith('https://');
    // 签名 Cookie 携带 state/verifier，多 worker 下回调仍可校验
    res.cookie('sso_oauth', started.session, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      maxAge: 10 * 60 * 1000,
      path: '/',
    });
    res.cookie('sso_state', started.state, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      maxAge: 10 * 60 * 1000,
    });
    res.cookie('sso_return', started.returnTo, {
      httpOnly: false,
      sameSite: 'lax',
      secure,
      maxAge: 10 * 60 * 1000,
    });
    return {
      url: started.url,
      redirectUri: started.redirectUri,
    };
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookie = res.req.cookies as Record<string, string | undefined>;
    const session = cookie?.sso_oauth;
    const result = await this.sso.callback(code ?? '', state ?? '', session);
    const returnPath = cookie?.sso_return || '/';
    const app = loadAppConfig();
    const target = new URL(
      app.sso.postLoginRedirect || `${app.site.origin}/auth/sso/callback`,
    );
    target.searchParams.set('token', result.token);
    target.searchParams.set('username', result.user.username);
    target.searchParams.set('returnTo', returnPath);
    res.clearCookie('sso_oauth');
    res.clearCookie('sso_state');
    res.clearCookie('sso_return');
    res.redirect(target.toString());
  }
}
