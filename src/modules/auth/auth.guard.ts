import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'common/decorators/public.decorator';
import type { Request } from 'express';

import { JweService } from './jwe.service';

type AuthRequest = Request & { user?: unknown };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jweService: JweService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthRequest>();
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const cookieToken = (req.cookies as Record<string, string> | undefined)?.access_token;
    const token = bearerToken ?? cookieToken;

    if (!token) {
      throw new UnauthorizedException('No authorization token provided');
    }

    try {
      req.user = await this.jweService.verifyToken(token);
      return true;
    } catch {
      throw new UnauthorizedException('Token is invalid or expired');
    }
  }
}
