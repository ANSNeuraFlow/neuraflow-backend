import { createHash } from 'node:crypto';
import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';

import { Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { EegMarker } from 'common/enums';
import { BridgeAuthRepository } from 'modules/bridge-auth/repository/bridge-auth.repository';
import { EegStreamService } from 'modules/eeg-stream/eeg-stream.service';
import { SessionsService } from 'modules/sessions/sessions.service';
import { RawData, WebSocket, WebSocketServer } from 'ws';

import type { BridgeControlAction } from './dtos/bridge-control-command.dto';

const CONTROL_WS_PATH = '/api/v1/bridge/control';
const STREAM_WS_PATH = '/api/v1/bridge/stream';
const BRIDGE_FRAME_BYTES = 44;

/** qint64 LE Wall-clock ms from bridge (DeviceManager uses QDateTime::currentMSecsSinceEpoch). */
const BRIDGE_TS_MIN_MS = 1_577_836_800_000n; // 2020-01-01
const BRIDGE_TS_MAX_MS = 4_294_967_295_000n; // year ~2106 (below uint32 ms edge cases)
/** Reject decoded floats outside |x| (µV) — misaligned frames become huge ints / denormals. */
const BRIDGE_MAX_UV_ABS = 2_000_000;
/** Search this far ahead for a valid frame start after a bad alignment (bytes). */
const BRIDGE_RESYNC_SCAN_MAX = 200;
/** Give up byte-by-byte slip after this many steps (avoid infinite loop on noise). */
const BRIDGE_RESYNC_MAX_SLIP_STEPS = 50_000;

export interface BridgeControlServerMessage {
  type: 'connected' | 'command';
  action?: BridgeControlAction | 'send_marker';
  marker?: string;
}

export interface BridgeControlClientMessage {
  type: 'status' | 'heartbeat';
  streaming?: boolean;
}

const EEG_MARKER_VALUES = new Set<string>(Object.values(EegMarker));

function isEegMarker(value: string): value is EegMarker {
  return EEG_MARKER_VALUES.has(value);
}

function isPlausibleBridgeFrame(buf: Buffer, off: number): boolean {
  if (off + BRIDGE_FRAME_BYTES > buf.length) {
    return false;
  }
  const ts = buf.readBigInt64LE(off);
  if (ts < BRIDGE_TS_MIN_MS || ts > BRIDGE_TS_MAX_MS) {
    return false;
  }
  for (let c = 0; c < 8; c++) {
    const v = buf.readFloatLE(off + 12 + c * 4);
    if (!Number.isFinite(v) || Math.abs(v) > BRIDGE_MAX_UV_ABS) {
      return false;
    }
  }
  return true;
}

@Injectable()
export class BridgeStreamService implements OnModuleDestroy {
  private readonly logger = new Logger(BridgeStreamService.name);
  private wss: WebSocketServer | null = null;
  private wssStream: WebSocketServer | null = null;
  private readonly socketsByUser = new Map<string, Set<WebSocket>>();
  private readonly streamSocketsByUser = new Map<string, Set<WebSocket>>();
  private readonly activeSessionByUser = new Map<string, string>();
  private readonly pendingMarkerByUser = new Map<string, EegMarker>();
  private readonly streamingByUser = new Map<string, boolean>();
  /** Epoch-ms of the last EEG frame forwarded per user — used to infer live streaming state. */
  private readonly lastFrameMsbyUser = new Map<string, number>();
  /** Warn once per user when EEG frames arrive but no REST session binding yet. */
  private readonly discardBinaryNoSessionWarnedUserIds = new Set<string>();
  /** Reassemble EEG frames split across WS messages / coalesced by the stack (44 B per sample). */
  private readonly streamBinaryRxBufferBySocket = new Map<WebSocket, Buffer>();
  /** Throttle resync warnings after misaligned binary uplink. */
  private readonly bridgeStreamResyncLogLastMsByUser = new Map<string, number>();
  private httpServer: Server | null = null;
  private upgradeListener: ((request: IncomingMessage, socket: Duplex, head: Buffer) => void) | null = null;

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly bridgeAuthRepo: BridgeAuthRepository,
    private readonly eegStreamService: EegStreamService,
    private readonly sessionsService: SessionsService,
  ) {}

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

    // Treat as streaming if the control socket reported streaming OR if EEG frames
    // arrived within the last 5 s (handles bridge reconnect without re-emitting status).
    const controlReported = this.streamingByUser.get(userId) ?? false;
    const lastFrameMs = this.lastFrameMsbyUser.get(userId) ?? 0;
    const streaming = controlReported || (streamConnected && Date.now() - lastFrameMs < 5_000);

    return { controlConnected, streamConnected, streaming };
  }

  async setActiveSession(userId: string, sessionId: string): Promise<void> {
    await this.sessionsService.findOne(userId, sessionId);
    this.activeSessionByUser.set(userId, sessionId);
    this.discardBinaryNoSessionWarnedUserIds.delete(userId);
    this.logger.debug(`Bridge Kafka session bound user=${userId} session=${sessionId}`);
  }

  clearActiveSession(userId: string): void {
    this.activeSessionByUser.delete(userId);
    this.pendingMarkerByUser.delete(userId);
    this.discardBinaryNoSessionWarnedUserIds.delete(userId);
  }

  private async resolveUserIdFromBridgeUpgrade(
    request: IncomingMessage,
    channel: 'control' | 'stream',
  ): Promise<{ userId: string } | { closeMessage: string }> {
    const token = this.extractBearer(request);
    if (!token) {
      this.logger.warn(`Bridge ${channel} WebSocket: missing Authorization Bearer token on upgrade`);
      return { closeMessage: 'Missing token' };
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const bridgeToken = await this.bridgeAuthRepo.findTokenByHash(tokenHash);

    if (!bridgeToken || bridgeToken.isExpired()) {
      this.logger.warn(`Bridge ${channel} WebSocket: invalid or expired bridge token`);
      return { closeMessage: 'Invalid or expired bridge token' };
    }

    return { userId: bridgeToken.userId };
  }

  private async handleControlConnection(socket: WebSocket, request: IncomingMessage): Promise<void> {
    const auth = await this.resolveUserIdFromBridgeUpgrade(request, 'control');
    if ('closeMessage' in auth) {
      socket.close(1008, auth.closeMessage);
      return;
    }
    const { userId } = auth;

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

  private async handleStreamConnection(socket: WebSocket, request: IncomingMessage): Promise<void> {
    const auth = await this.resolveUserIdFromBridgeUpgrade(request, 'stream');
    if ('closeMessage' in auth) {
      socket.close(1008, auth.closeMessage);
      return;
    }
    const { userId } = auth;

    this.addStreamSocket(userId, socket);
    let frameCount = 0;

    socket.on('message', (data: RawData) => {
      const markerHandled = this.tryHandleStreamTextMarker(userId, data);
      if (markerHandled) {
        return;
      }

      const buf = this.toBuffer(data);
      if (!buf || buf.length === 0) {
        return;
      }
      frameCount++;
      const framesProcessed = this.drainBridgeStreamBinaryChunks(socket, userId, buf);
      if (frameCount === 1 || frameCount % 250 === 0) {
        this.logger.debug(
          `Bridge stream user=${userId} inboundBytes=${buf.length} framesEmitted=${framesProcessed} totalChunks=${frameCount}`,
        );
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

  private drainBridgeStreamBinaryChunks(socket: WebSocket, userId: string, chunk: Buffer): number {
    const MAX_BACKLOG = 256 * BRIDGE_FRAME_BYTES;
    let acc = this.streamBinaryRxBufferBySocket.get(socket);
    acc = acc?.length ? Buffer.concat([acc, chunk]) : chunk;
    if (acc.length > MAX_BACKLOG) {
      this.logger.warn(`Bridge stream RX buffer overflow user=${userId} bytes=${acc.length}; resetting buffer`);
      acc = chunk;
    }

    let framesEmitted = 0;
    let slipSteps = 0;

    while (acc.length >= BRIDGE_FRAME_BYTES) {
      if (isPlausibleBridgeFrame(acc, 0)) {
        this.forwardBridgeBinaryFrame(userId, Buffer.from(acc.subarray(0, BRIDGE_FRAME_BYTES)));
        framesEmitted++;
        acc = acc.subarray(BRIDGE_FRAME_BYTES);
        slipSteps = 0;
        continue;
      }

      let foundAt = -1;
      const scanEnd = Math.min(BRIDGE_RESYNC_SCAN_MAX, acc.length - BRIDGE_FRAME_BYTES);
      for (let s = 1; s <= scanEnd; s++) {
        if (isPlausibleBridgeFrame(acc, s)) {
          foundAt = s;
          break;
        }
      }

      if (foundAt >= 0) {
        const now = Date.now();
        const last = this.bridgeStreamResyncLogLastMsByUser.get(userId) ?? 0;
        if (now - last > 15_000) {
          this.bridgeStreamResyncLogLastMsByUser.set(userId, now);
          this.logger.warn(
            `Bridge stream resync user=${userId}: dropped ${foundAt} leading bytes (misaligned EEG frames)`,
          );
        }
        acc = acc.subarray(foundAt);
        slipSteps = 0;
        continue;
      }

      acc = acc.subarray(1);
      slipSteps++;
      if (slipSteps > BRIDGE_RESYNC_MAX_SLIP_STEPS) {
        this.logger.warn(`Bridge stream resync exhausted user=${userId}; discarding ${acc.length} bytes`);
        acc = Buffer.alloc(0);
        break;
      }
    }

    if (acc.length > 0) {
      this.streamBinaryRxBufferBySocket.set(socket, Buffer.from(acc));
    } else {
      this.streamBinaryRxBufferBySocket.delete(socket);
    }
    return framesEmitted;
  }

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
      if (isEegMarker(parsed.marker)) {
        this.pendingMarkerByUser.set(userId, parsed.marker);
        this.logger.debug(`Bridge stream marker user=${userId} marker=${parsed.marker}`);
      } else {
        this.logger.debug(
          `Bridge stream marker ignored (not in EegMarker enum) user=${userId} marker=${parsed.marker}`,
        );
      }
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
    if (ArrayBuffer.isView(data)) {
      const v = data as ArrayBufferView;
      return Buffer.from(v.buffer, v.byteOffset, v.byteLength);
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
    this.streamBinaryRxBufferBySocket.delete(socket);
    const set = this.streamSocketsByUser.get(userId);
    if (set) {
      set.delete(socket);
      if (set.size === 0) {
        this.streamSocketsByUser.delete(userId);
        this.lastFrameMsbyUser.delete(userId);
        this.clearActiveSession(userId);
      }
    }
  }

  private forwardBridgeBinaryFrame(userId: string, buf: Buffer): void {
    if (buf.length !== BRIDGE_FRAME_BYTES || !isPlausibleBridgeFrame(buf, 0)) {
      return;
    }

    this.lastFrameMsbyUser.set(userId, Date.now());
    const sessionId = this.activeSessionByUser.get(userId);
    if (!sessionId) {
      if (!this.discardBinaryNoSessionWarnedUserIds.has(userId)) {
        this.discardBinaryNoSessionWarnedUserIds.add(userId);
        this.logger.warn(
          `Bridge EEG binary discarded (no Kafka session binding for user=${userId}). Call POST bridge/control/session before streaming.`,
        );
      }
      return;
    }

    const timestamp = Number(buf.readBigInt64LE(0));
    const ch1 = buf.readFloatLE(12);
    const ch2 = buf.readFloatLE(16);
    const ch3 = buf.readFloatLE(20);
    const ch4 = buf.readFloatLE(24);
    const ch5 = buf.readFloatLE(28);
    const ch6 = buf.readFloatLE(32);
    const ch7 = buf.readFloatLE(36);
    const ch8 = buf.readFloatLE(40);

    const marker = this.pendingMarkerByUser.get(userId);
    const payload =
      marker !== undefined
        ? { timestamp, ch1, ch2, ch3, ch4, ch5, ch6, ch7, ch8, marker }
        : { timestamp, ch1, ch2, ch3, ch4, ch5, ch6, ch7, ch8 };

    if (marker !== undefined) {
      this.pendingMarkerByUser.delete(userId);
    }

    this.eegStreamService.sendEegSample(userId, sessionId, payload);
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
