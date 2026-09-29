import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from './prisma.service';

/**
 * 后台管理员守卫：仅 SSO root（user_id=0 / public_id=0）可访问。
 * 后台默认对所有普通用户关闭。
 */
@Injectable()
export class RootGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<
      Request & { user?: { sub: number; username: string; isRoot?: boolean } }
    >();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('需要登录');
    }
    let payload: { sub: number; username: string; isRoot?: boolean };
    try {
      payload = this.jwt.verify(header.slice(7)) as typeof payload;
    } catch {
      throw new UnauthorizedException('登录凭证无效');
    }
    req.user = payload;

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('用户不存在');
    if (!user.isRoot) {
      throw new ForbiddenException('后台仅对 root 用户开放');
    }
    // 以数据库为准，防止伪造 JWT
    req.user.isRoot = true;
    return true;
  }
}
