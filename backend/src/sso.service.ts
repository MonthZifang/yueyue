import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from './prisma.service';
import { getSsoConfig, isRootSsoId, loadAppConfig } from './config';

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function b64urlDecode(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

interface SsoConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  postLoginRedirect: string;
  scopes: string;
}

export interface SsoProfile {
  user_id: string;
  email: string;
  email_verified: boolean;
  username: string;
  display_name: string;
  avatar_url: string;
  public_id?: number | null;
  public_id_hidden?: boolean;
  custom_id?: string;
}

export interface PendingAuth {
  state: string;
  nonce: string;
  verifier: string;
  exp: number;
}

/** root 判定：SSO user_id=0 / public_id=0 / 配置里的 rootUserIds */
export function isRootProfile(p: {
  user_id?: string | number;
  public_id?: number | null;
  custom_id?: string;
  username?: string;
}): boolean {
  return isRootSsoId(p.user_id, p.public_id ?? null);
}

@Injectable()
export class SsoService {
  private readonly logger = new Logger(SsoService.name);
  /** 兼容单进程；多 worker 下以签名 Cookie 为准 */
  private readonly pending = new Map<string, PendingAuth>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private secret(): string {
    return loadAppConfig().auth.jwtSecret || 'yueyuedao-blog-jwt';
  }

  private config(): SsoConfig {
    const sso = getSsoConfig();
    if (!sso.issuer || !sso.clientId) {
      throw new BadRequestException(
        'SSO 未配置：请检查 config/app.config.json 的 sso.issuer / sso.clientId',
      );
    }
    return {
      issuer: sso.issuer.replace(/\/$/, ''),
      clientId: sso.clientId,
      clientSecret: sso.clientSecret,
      redirectUri: sso.redirectUri,
      postLoginRedirect: sso.postLoginRedirect,
      scopes: sso.scopes?.length
        ? sso.scopes.join(' ')
        : 'openid profile email offline_access',
    };
  }

  isEnabled(): boolean {
    const sso = getSsoConfig();
    return Boolean(sso.enabled && sso.issuer && sso.clientId);
  }

  /** 把 PKCE verifier 等放进签名 Cookie，跨 cluster worker 可用 */
  signSession(pending: PendingAuth): string {
    const body = b64url(JSON.stringify(pending));
    const sig = b64url(createHmac('sha256', this.secret()).update(body).digest());
    return `${body}.${sig}`;
  }

  verifySession(raw: string | undefined | null): PendingAuth | null {
    if (!raw) return null;
    const [body, sig] = raw.split('.');
    if (!body || !sig) return null;
    try {
      const expected = b64url(createHmac('sha256', this.secret()).update(body).digest());
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
      const pending = JSON.parse(b64urlDecode(body).toString('utf8')) as PendingAuth;
      if (!pending?.state || !pending?.verifier) return null;
      if (pending.exp < Date.now()) return null;
      return pending;
    } catch {
      return null;
    }
  }

  beginLogin(returnTo = '/') {
    const cfg = this.config();
    const state = b64url(randomBytes(16));
    const nonce = b64url(randomBytes(16));
    const verifier = b64url(randomBytes(32));
    const challenge = b64url(createHash('sha256').update(verifier).digest());
    const exp = Date.now() + 10 * 60 * 1000;
    const pending: PendingAuth = { state, nonce, verifier, exp };
    this.pending.set(state, pending);

    const url = new URL(`${cfg.issuer}/oauth2/authorize`);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
      scope: cfg.scopes,
      state,
      nonce,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
    url.search = params.toString();

    return {
      url: url.toString(),
      state,
      session: this.signSession(pending),
      returnTo,
      redirectUri: cfg.redirectUri,
    };
  }

  async callback(code: string, state: string, sessionCookie?: string | null) {
    const cfg = this.config();
    // 优先 Cookie（多 worker），其次内存
    let saved = this.verifySession(sessionCookie);
    if (!saved || saved.state !== state) {
      saved = this.pending.get(state) ?? null;
    }
    this.pending.delete(state);
    if (!saved || saved.state !== state) {
      throw new UnauthorizedException('state 无效或已过期');
    }
    if (saved.exp < Date.now()) {
      throw new UnauthorizedException('state 已过期');
    }
    if (!code) throw new BadRequestException('缺少 code');

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: cfg.redirectUri,
      code_verifier: saved.verifier,
      client_id: cfg.clientId,
    });
    if (cfg.clientSecret) {
      body.set('client_secret', cfg.clientSecret);
    }

    const res = await fetch(`${cfg.issuer}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });
    const tokenSet = (await res.json()) as {
      access_token?: string;
      id_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!res.ok || !tokenSet.access_token) {
      throw new UnauthorizedException(
        tokenSet.error_description || tokenSet.error || '换取令牌失败',
      );
    }

    const profile = await this.fetchProfile(cfg.issuer, tokenSet.access_token);
    const ssoUserId = profile.user_id || profile.username || `sso-${state.slice(0, 8)}`;
    const username = profile.username || profile.email || ssoUserId;
    const displayName = profile.display_name || username;
    const email = profile.email || null;
    const isRoot = isRootProfile(profile);
    // SSO 头像常为相对路径 /uploads/avatars/...，需拼成完整可访问 URL
    const avatarUrl = this.resolveAvatarUrl(cfg.issuer, profile.avatar_url);

    let user = await this.prisma.user.findUnique({
      where: { ssoUserId: String(ssoUserId) },
    });
    if (!user) {
      user = await this.prisma.user.findUnique({ where: { username } });
    }
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          username,
          passwordHash: b64url(randomBytes(32)),
          displayName,
          email,
          avatarUrl,
          ssoUserId: String(ssoUserId),
          ssoPublicId: profile.public_id ?? null,
          isRoot,
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          displayName,
          email,
          avatarUrl,
          ssoUserId: String(ssoUserId),
          ssoPublicId: profile.public_id ?? null,
          isRoot,
        },
      });
    }

    // 头像/昵称变更后，同步到历史评论与留言
    if (user.id) {
      await this.syncUserAvatarToContent(user.id, user.displayName, user.avatarUrl);
    }

    const jwt = await this.jwt.signAsync({
      sub: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      email: user.email,
      isRoot: user.isRoot,
      sso: true,
    });
    return {
      token: jwt,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        email: user.email,
        isRoot: user.isRoot,
        sso: true,
      },
    };
  }

  private resolveAvatarUrl(issuer: string, avatar?: string | null): string | null {
    if (!avatar || !avatar.trim()) return null;
    const v = avatar.trim();
    if (/^https?:\/\//i.test(v)) return v;
    if (v.startsWith('//')) return `https:${v}`;
    if (v.startsWith('/')) return `${issuer.replace(/\/$/, '')}${v}`;
    return `${issuer.replace(/\/$/, '')}/${v}`;
  }


  /** 用户头像/昵称更新后，写回历史评论、留言、项目评论 */
  /** 后台：把所有用户当前头像/昵称刷到历史内容 */
  async syncAllAvatarsToContent() {
    const users = await this.prisma.user.findMany({
      select: { id: true, displayName: true, avatarUrl: true },
    });
    let updated = 0;
    for (const u of users) {
      await this.syncUserAvatarToContent(u.id, u.displayName, u.avatarUrl);
      updated += 1;
    }
    return { ok: true, users: updated };
  }
  async syncUserAvatarToContent(userId: number, displayName: string | null, avatarUrl: string | null) {
    const nickname = displayName || undefined;
    await this.prisma.comment.updateMany({
      where: { userId },
      data: {
        ...(avatarUrl ? { avatarUrl } : {}),
        ...(nickname ? { nickname } : {}),
      },
    });
    await this.prisma.guestbook.updateMany({
      where: { userId },
      data: {
        ...(avatarUrl ? { avatarUrl } : {}),
        ...(nickname ? { nickname } : {}),
      },
    });
    await this.prisma.projectComment.updateMany({
      where: { userId },
      data: {
        ...(avatarUrl ? { avatarUrl } : {}),
        ...(nickname ? { nickname } : {}),
      },
    });
  }
  private async fetchProfile(issuer: string, accessToken: string): Promise<SsoProfile> {
    const empty: SsoProfile = {
      user_id: '',
      email: '',
      email_verified: false,
      username: '',
      display_name: '',
      avatar_url: '',
    };
    try {
      const res = await fetch(`${issuer}/oauth2/profile`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        this.logger.warn(`profile failed: ${res.status}`);
        return empty;
      }
      const body = (await res.json()) as { data?: SsoProfile };
      return body.data ?? empty;
    } catch (e) {
      this.logger.warn(`profile error: ${String(e)}`);
      return empty;
    }
  }
}
