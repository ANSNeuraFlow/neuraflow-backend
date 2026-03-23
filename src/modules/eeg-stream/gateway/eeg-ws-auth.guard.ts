import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { UnauthorizedWsException } from 'common/exceptions/ws';
import { JweService } from 'modules/auth/jwe.service';

import type { WsUserPayload } from '../../cluster/models/ws.model';
import type { EegSocket } from '../models/eeg-ws.model';

@Injectable()
export class EegWsAuthGuard implements CanActivate {
  constructor(private readonly jweService: JweService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<EegSocket>();

    const token = this.extractToken(client);

    if (!token) {
      throw new UnauthorizedWsException('No authorization token provided');
    }

    const sessionId = client.handshake.query.sessionId as string | undefined;

    if (!sessionId) {
      throw new UnauthorizedWsException('No sessionId provided');
    }

    try {
      const payload = (await this.jweService.verifyToken(token)) as unknown as WsUserPayload;

      client.data.userId = payload.id;
      client.data.sessionId = sessionId;
      client.data.user = payload;

      return true;
    } catch (error) {
      if (error instanceof WsException) throw error;
      throw new UnauthorizedWsException('Token is invalid or expired');
    }
  }

  private extractToken(client: EegSocket): string | undefined {
    const auth = client.handshake.auth as Record<string, unknown> | undefined;
    const tokenFromAuth = auth?.['token'] as string | undefined;
    const tokenFromHeader = client.handshake.headers?.['authorization']?.replace('Bearer ', '');

    return tokenFromAuth ?? tokenFromHeader;
  }
}
