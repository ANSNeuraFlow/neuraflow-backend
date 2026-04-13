import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { UnauthorizedWsException } from 'common/exceptions/ws';
import { JweService } from 'modules/auth/jwe.service';
import type { Socket } from 'socket.io';

@Injectable()
export class EegDisplayAuthGuard implements CanActivate {
  constructor(private readonly jweService: JweService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();
    const token = this.extractToken(client);

    if (!token) {
      throw new UnauthorizedWsException('Brak tokenu autoryzacji');
    }

    try {
      const payload = await this.jweService.verifyToken(token);
      (client.data as Record<string, unknown>)['user'] = payload;
      return true;
    } catch (error) {
      if (error instanceof WsException) throw error;
      throw new UnauthorizedWsException('Token jest nieprawidłowy lub wygasł');
    }
  }

  private extractToken(client: Socket): string | undefined {
    const auth = client.handshake.auth as Record<string, unknown> | undefined;
    const tokenFromAuth = auth?.['token'] as string | undefined;
    const tokenFromHeader = client.handshake.headers?.['authorization']?.replace('Bearer ', '');
    const tokenFromCookie = this.extractFromCookie(client.handshake.headers?.['cookie']);
    return tokenFromAuth ?? tokenFromHeader ?? tokenFromCookie;
  }

  private extractFromCookie(cookieHeader: string | undefined): string | undefined {
    if (!cookieHeader) return undefined;
    const match = cookieHeader
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('access_token='));
    return match ? decodeURIComponent(match.slice('access_token='.length)) : undefined;
  }
}
