import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { SessionStatus } from 'common/enums';
import { UnauthorizedWsException } from 'common/exceptions/ws';
import { JweService } from 'modules/auth/jwe.service';
import { SessionsService } from 'modules/sessions/sessions.service';

import type { WsUserPayload } from '../../cluster/models/ws.model';
import type { EegSocket } from '../models/eeg-ws.model';
@Injectable()
export class EegWsAuthGuard implements CanActivate {
  constructor(
    private readonly jweService: JweService,
    private readonly sessionsService: SessionsService,
  ) {}
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
    let payload: WsUserPayload;
    try {
      payload = (await this.jweService.verifyToken(token)) as unknown as WsUserPayload;
    } catch (error) {
      if (error instanceof WsException) throw error;
      throw new UnauthorizedWsException('Token is invalid or expired');
    }
    const sessionData = await this.sessionsService.findForWsGuard(payload.id, sessionId);
    if (!sessionData) {
      throw new UnauthorizedWsException('Session not found or does not belong to you');
    }
    if (sessionData.status !== SessionStatus.INITIALIZED && sessionData.status !== SessionStatus.ACTIVE) {
      throw new UnauthorizedWsException(`Session is ${sessionData.status} – cannot stream`);
    }
    if (sessionData.status === SessionStatus.INITIALIZED) {
      await this.sessionsService.activateSession(sessionId);
    }
    client.data.userId = payload.id;
    client.data.sessionId = sessionId;
    client.data.user = payload;
    return true;
  }
  private extractToken(client: EegSocket): string | undefined {
    const auth = client.handshake.auth as Record<string, unknown> | undefined;
    const tokenFromAuth = auth?.['token'] as string | undefined;
    const tokenFromHeader = client.handshake.headers?.['authorization']?.replace('Bearer ', '');
    return tokenFromAuth ?? tokenFromHeader;
  }
}
