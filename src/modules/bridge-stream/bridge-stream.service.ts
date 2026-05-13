import { createHash } from 'node:crypto';
import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';

import { Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { BridgeAuthRepository } from 'modules/bridge-auth/repository/bridge-auth.repository';
import { RawData, WebSocket, WebSocketServer } from 'ws';

import type { BridgeControlAction } from './dtos/bridge-control-command.dto';

const CONTROL_WS_PATH = '/api/v1/bridge/control';
const STREAM_WS_PATH = '/api/v1/bridge/stream';

/** Bridge binary frame: int64 ts, uint32 seq, 8× float32 µV (from neuraflow-bridge `DeviceManager`). */
const BRIDGE_FRAME_BYTES = 44;

/** JSON protocol (text frames). */
export interface BridgeControlServerMessage {
  type: 'connected' | 'command';
  action?: BridgeControlAction | 'send_marker';
  marker?: string;
}

export interface BridgeControlClientMessage {
  type: 'status' | 'heartbeat';
  streaming?: boolean;
}

@Injectable()
export class BridgeStreamService implements OnModuleDestroy {
  private readonly logger = new Logger(BridgeStreamService.name);
  private wss: WebSocketServer | null = null;
  private wssStream: WebSocketServer | null = null;
  /** userId -> control sockets (for server-originated commands). */
  private readonly socketsByUser = new Map<string, Set<WebSocket>>();
  /** userId -> EEG stream upload sockets (binary frames from bridge). */
  private readonly streamSocketsByUser = new Map<string, Set<WebSocket>>();
  /** Last known device streaming state reported by bridge control channel, per user. */
  private readonly streamingByUser = new Map<string, boolean>();
  private httpServer: Server | null = null;
  private upgradeListener: ((request: IncomingMessage, socket: Duplex, head: Buffer) => void) | null = null;

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly bridgeAuthRepo: BridgeAuthRepository,
  ) {}

  /**
   * Attach raw `ws` upgrade handlers. Call **after** `app.listen()` so the HTTP server
   * is the bound listener, and use `prependListener` so `/api/v1/bridge/*` is handled
   * before Socket.IO's Engine (which would otherwise reject unknown upgrade paths).
   */
  registerHttpUpgradeHandlers(): void {
    if (this.upgradeListener) {
      return;
    }

    const httpServer = this.httpAdapterHost.httpAdapter?.getHttpServer() as Server | undefined;
    if (!httpServer) {
      this.logger.error('HTTP server not available; bridge WebSockets disabled');
      return;
    }

    this.httpServer = httpServer;
    this.wss = new WebSocketServer({ noServer: true });
    this.wssStream = new WebSocketServer({ noServer: true });

    this.wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
      void this.handleControlConnection(socket, request).catch((err: unknown) => {
        this.logger.warn(`Bridge control connection error: ${err instanceof Error ? err.message : String(err)}`);
        socket.close(1008, 'Unauthorized');
      });
    });

    this.wssStream.on('connection', (socket: WebSocket, request: IncomingMessage) => {
      void this.handleStreamConnection(socket, request).catch((err: unknown) => {
        this.logger.warn(`Bridge stream connection error: ${err instanceof Error ? err.message : String(err)}`);
        socket.close(1008, 'Unauthorized');
      });
    });

    this.upgradeListener = (request: IncomingMessage, socket: Duplex, head: Buffer) => {
      try {
        const host = request.headers.host ?? 'localhost';
        const pathname = new URL(request.url ?? '/', `http://${host}`).pathname;
        if (pathname === CONTROL_WS_PATH) {
          this.wss!.handleUpgrade(request, socket, head, (upgraded: WebSocket) => {
            this.wss!.emit('connection', upgraded, request);
          });
          return;
        }
        if (pathname === STREAM_WS_PATH) {
          this.wssStream!.handleUpgrade(request, socket, head, (upgraded: WebSocket) => {
            this.wssStream!.emit('connection', upgraded, request);
          });
          return;
        }
      } catch (e) {
        this.logger.warn(`upgrade failed: ${e instanceof Error ? e.message : String(e)}`);
        socket.destroy();
      }
    };

    httpServer.prependListener('upgrade', this.upgradeListener);
    this.logger.log(`Bridge control WebSocket: ${CONTROL_WS_PATH}`);
    this.logger.log(`Bridge EEG stream WebSocket (binary frames): ${STREAM_WS_PATH}`);
  }

  onModuleDestroy(): void {
    if (this.httpServer && this.upgradeListener) {
      this.httpServer.removeListener('upgrade', this.upgradeListener);
    }
    this.wss?.close();
    this.wss = null;
    this.wssStream?.close();
    this.wssStream = null;
    this.upgradeListener = null;
    this.httpServer = null;
  }

  /**
   * Sends a streaming command to all bridge **control** sockets for the given user (user JWT id).
   */
  sendStreamingCommand(userId: string, action: BridgeControlAction): number {
    const set = this.socketsByUser.get(userId);
    if (!set || set.size === 0) {
      throw new NotFoundException('No bridge connected for this user');
    }

    const payload = JSON.stringify({
      type: 'command',
      action,
    } satisfies BridgeControlServerMessage);

    let sent = 0;
    for (const ws of set) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
        sent++;
      }
    }
    return sent;
  }

  /**
   * Sends a BCI marker command to all bridge control sockets for the user (desktop relays to stream uplink).
   */
  sendMarkerCommand(userId: string, marker: string): number {
    const set = this.socketsByUser.get(userId);
    if (!set || set.size === 0) {
      throw new NotFoundException('No bridge connected for this user');
    }

    const payload = JSON.stringify({
      type: 'command',
      action: 'send_marker',
      marker,
    } satisfies BridgeControlServerMessage);

    let sent = 0;
    for (const ws of set) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
        sent++;
      }
    }
    return sent;
  }

  getBridgeStatus(userId: string): {
    controlConnected: boolean;
    streamConnected: boolean;
    streaming: boolean;
  } {
    const controlSockets = this.socketsByUser.get(userId);
    const controlConnected =
      !!controlSockets && controlSockets.size > 0 && [...controlSockets].some((ws) => ws.readyState === WebSocket.OPEN);

    const streamSockets = this.streamSocketsByUser.get(userId);
    const streamConnected =
      !!streamSockets && streamSockets.size > 0 && [...streamSockets].some((ws) => ws.readyState === WebSocket.OPEN);

    const streaming = this.streamingByUser.get(userId) ?? false;

    return { controlConnected, streamConnected, streaming };
  }

  private async handleControlConnection(socket: WebSocket, request: IncomingMessage): Promise<void> {
    const token = this.extractBearer(request);
    if (!token) {
      this.logger.warn('Bridge control WebSocket: missing Authorization Bearer token on upgrade');
      socket.close(1008, 'Missing token');
      return;
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const bridgeToken = await this.bridgeAuthRepo.findTokenByHash(tokenHash);

    if (!bridgeToken || bridgeToken.isExpired()) {
      this.logger.warn('Bridge control WebSocket: invalid or expired bridge token');
      socket.close(1008, 'Invalid or expired bridge token');
      return;
    }

    const userId = bridgeToken.userId;
    this.addControlSocket(userId, socket);

    socket.send(JSON.stringify({ type: 'connected' } satisfies BridgeControlServerMessage));

    socket.on('message', (data: RawData) => {
      this.onControlClientMessage(userId, data);
    });

    socket.on('close', () => {
      this.removeControlSocket(userId, socket);
    });

    socket.on('error', (err: Error) => {
      this.logger.debug(`Bridge control socket error (user ${userId}): ${err.message}`);
    });

    this.logger.log(`Bridge control client connected (user ${userId})`);
  }

  /**
   * Raw binary EEG frames from the desktop bridge (`StreamUploader`).
   */
  private async handleStreamConnection(socket: WebSocket, request: IncomingMessage): Promise<void> {
    const token = this.extractBearer(request);
    if (!token) {
      this.logger.warn('Bridge stream WebSocket: missing Authorization Bearer token on upgrade');
      socket.close(1008, 'Missing token');
      return;
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const bridgeToken = await this.bridgeAuthRepo.findTokenByHash(tokenHash);

    if (!bridgeToken || bridgeToken.isExpired()) {
      this.logger.warn('Bridge stream WebSocket: invalid or expired bridge token');
      socket.close(1008, 'Invalid or expired bridge token');
      return;
    }

    const userId = bridgeToken.userId;
    this.addStreamSocket(userId, socket);
    let frameCount = 0;

    socket.on('message', (data: RawData) => {
      const markerHandled = this.tryHandleStreamTextMarker(userId, data);
      if (markerHandled) {
        return;
      }

      const buf = this.toBuffer(data);
      if (!buf) {
        return;
      }
      frameCount++;
      if (buf.length % BRIDGE_FRAME_BYTES !== 0) {
        this.logger.warn(
          `Bridge stream odd payload length user=${userId} bytes=${buf.length} (expected multiple of ${BRIDGE_FRAME_BYTES})`,
        );
        return;
      }
      if (frameCount === 1 || frameCount % 250 === 0) {
        const frames = buf.length / BRIDGE_FRAME_BYTES;
        this.logger.debug(`Bridge stream user=${userId} batch frames=${frames} totalMessages=${frameCount}`);
      }
    });

    socket.on('close', () => {
      this.removeStreamSocket(userId, socket);
      this.logger.log(`Bridge stream client disconnected (user ${userId}), frames=${frameCount}`);
    });

    socket.on('error', (err: Error) => {
      this.logger.debug(`Bridge stream socket error (user ${userId}): ${err.message}`);
    });

    this.logger.log(`Bridge EEG stream client connected (user ${userId})`);
  }

  /** Text JSON frames on the stream socket carry BCI markers (binary frames are EEG). */
  private tryHandleStreamTextMarker(userId: string, data: RawData): boolean {
    let text: string | null = null;
    if (typeof data === 'string') {
      text = data;
    } else if (Buffer.isBuffer(data) && data.length > 0 && data[0] === 0x7b) {
      text = data.toString('utf8');
    }
    if (!text) {
      return false;
    }
    let parsed: { type?: string; marker?: string };
    try {
      parsed = JSON.parse(text) as { type?: string; marker?: string };
    } catch {
      return false;
    }
    if (parsed.type === 'marker' && typeof parsed.marker === 'string') {
      this.logger.debug(`Bridge stream marker user=${userId} marker=${parsed.marker}`);
      return true;
    }
    return false;
  }

  private toBuffer(data: RawData): Buffer | null {
    if (Buffer.isBuffer(data)) {
      return data;
    }
    if (typeof data === 'string') {
      return Buffer.from(data);
    }
    if (Array.isArray(data)) {
      return Buffer.concat(data.map((c) => (Buffer.isBuffer(c) ? c : Buffer.from(c as ArrayBuffer))));
    }
    if (data instanceof ArrayBuffer) {
      return Buffer.from(data);
    }
    return null;
  }

  private onControlClientMessage(userId: string, data: RawData): void {
    if (typeof data !== 'string' && !Buffer.isBuffer(data)) {
      return;
    }
    const text = typeof data === 'string' ? data : data.toString('utf8');
    let parsed: BridgeControlClientMessage;
    try {
      parsed = JSON.parse(text) as BridgeControlClientMessage;
    } catch {
      return;
    }
    if (parsed.type === 'status' && typeof parsed.streaming === 'boolean') {
      this.streamingByUser.set(userId, parsed.streaming);
      this.logger.debug(`Bridge status user ${userId}: streaming=${parsed.streaming}`);
    }
  }

  private addControlSocket(userId: string, socket: WebSocket): void {
    let set = this.socketsByUser.get(userId);
    if (!set) {
      set = new Set();
      this.socketsByUser.set(userId, set);
    }
    set.add(socket);
  }

  private removeControlSocket(userId: string, socket: WebSocket): void {
    const set = this.socketsByUser.get(userId);
    if (set) {
      set.delete(socket);
      if (set.size === 0) {
        this.socketsByUser.delete(userId);
        this.streamingByUser.delete(userId);
      }
    }
  }

  private addStreamSocket(userId: string, socket: WebSocket): void {
    let set = this.streamSocketsByUser.get(userId);
    if (!set) {
      set = new Set();
      this.streamSocketsByUser.set(userId, set);
    }
    set.add(socket);
  }

  private removeStreamSocket(userId: string, socket: WebSocket): void {
    const set = this.streamSocketsByUser.get(userId);
    if (set) {
      set.delete(socket);
      if (set.size === 0) {
        this.streamSocketsByUser.delete(userId);
      }
    }
  }

  private extractBearer(request: IncomingMessage): string | null {
    const raw = request.headers.authorization;
    if (!raw || typeof raw !== 'string') {
      return null;
    }
    if (!raw.startsWith('Bearer ')) {
      return null;
    }
    return raw.slice('Bearer '.length).trim() || null;
  }
}
