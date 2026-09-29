import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface JwtUser {
  sub: number;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  email?: string;
  isRoot?: boolean;
}

/** 可选鉴权：带 token 则解析到 req.user，无 token 也放行。 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtUser }>();
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      try {
        req.user = this.jwt.verify(header.slice(7)) as JwtUser;
      } catch {
        req.user = undefined;
      }
    }
    return true;
  }
}
