import { createHash } from 'node:crypto';

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

import { BridgeAuthRepository } from './repository/bridge-auth.repository';

export interface BridgeAuthenticatedRequest extends Request {
  bridge: {
    userId: string;
    tokenId: string;
    deviceId: string | null;
  };
}

@Injectable()
export class BridgeAuthGuard implements CanActivate {
  constructor(private readonly repo: BridgeAuthRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<BridgeAuthenticatedRequest>();
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      throw new UnauthorizedException('No bridge token provided');
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const bridgeToken = await this.repo.findTokenByHash(tokenHash);

    if (!bridgeToken) {
      throw new UnauthorizedException('Invalid bridge token');
    }
    if (bridgeToken.isExpired()) {
      throw new UnauthorizedException('Bridge token expired');
    }

    req.bridge = {
      userId: bridgeToken.userId,
      tokenId: bridgeToken.id,
      deviceId: bridgeToken.deviceId,
    };

    return true;
  }
}
