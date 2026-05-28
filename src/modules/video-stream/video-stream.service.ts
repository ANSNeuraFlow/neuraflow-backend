import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';

import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { Interval } from '@nestjs/schedule';
import type { AppConfig, VideoStreamConfig } from 'config/configuration';
import type { types as MediasoupTypes } from 'mediasoup';
import * as mediasoup from 'mediasoup';
import { JweService } from 'modules/auth/jwe.service';
import NodeMediaServer from 'node-media-server';
import { RawData, WebSocket, WebSocketServer } from 'ws';

import { VideoStreamRepository } from './repositories/video-stream.repository';
import { normalizeRawData } from './utils/normalize-raw-data.util';

const WATCH_WS_PATH = '/api/v1/video-stream/watch';
const LOCAL_RTMP_PATH = '/live';
const VIDEO_SSRC = 11111111;

/** node-media-server v4 passes a session object; v2 passes (id, streamPath, args). */
interface NmsPublishSession {
  id: string;
  streamPath?: string;
  close?: () => void;
}

interface RuntimeStream {
  streamKey: string;
  userId: string;
  dbId: string;
  router: MediasoupTypes.Router;
  producer: MediasoupTypes.Producer | null;
  plainTransport: MediasoupTypes.PlainTransport | null;
  ffmpegProcess: ChildProcessWithoutNullStreams | null;
  consumers: Map<string, MediasoupTypes.Consumer>;
  recvTransports: Map<string, MediasoupTypes.WebRtcTransport>;
  rtmpReceivedAt: number;
  producerCreatedAt: number | null;
}

interface WatchClientMessage {
  type: string;
  transportId?: string;
  dtlsParameters?: MediasoupTypes.DtlsParameters;
  rtpCapabilities?: MediasoupTypes.RtpCapabilities;
  consumerId?: string;
}

@Injectable()
export class VideoStreamService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VideoStreamService.name);
  private config!: VideoStreamConfig;
  private worker: MediasoupTypes.Worker | null = null;
  private nms: NodeMediaServer | null = null;
  private readonly runtimeStreams = new Map<string, RuntimeStream>();
  private readonly allowedStreamKeys = new Set<string>();
  private wss: WebSocketServer | null = null;
  private httpServer: Server | null = null;
  private upgradeListener: ((request: IncomingMessage, socket: Duplex, head: Buffer) => void) | null = null;

  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly repo: VideoStreamRepository,
    private readonly jweService: JweService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.config = this.configService.get<VideoStreamConfig>('videoStream');
    if (!this.config.enabled) {
      this.logger.log('Video streaming disabled (VIDEO_STREAM_ENABLED=false)');
      return;
    }

    this.worker = await mediasoup.createWorker({
      logLevel: 'warn',
      rtcMinPort: this.config.webrtcMinPort,
      rtcMaxPort: this.config.webrtcMaxPort,
    });

    this.worker.on('died', () => {
      this.logger.error('MediaSoup worker died');
    });

    this.startRtmpServer();
    this.logger.log(`RTMP ingest listening on port ${this.config.rtmpIngestPort}`);
  }

  onModuleDestroy(): void {
    if (this.httpServer && this.upgradeListener) {
      this.httpServer.removeListener('upgrade', this.upgradeListener);
    }
    this.wss?.close();
    this.wss = null;
    this.upgradeListener = null;
    this.httpServer = null;

    for (const key of [...this.runtimeStreams.keys()]) {
      this.teardownRuntimeStream(key);
    }

    this.nms?.stop();
    this.nms = null;
    this.worker?.close();
    this.worker = null;
  }

  registerHttpUpgradeHandlers(): void {
    if (!this.config?.enabled || this.upgradeListener) {
      return;
    }

    const httpServer = this.httpAdapterHost.httpAdapter?.getHttpServer() as Server | undefined;
    if (!httpServer) {
      this.logger.error('HTTP server not available; video watch WebSocket disabled');
      return;
    }

    this.httpServer = httpServer;
    this.wss = new WebSocketServer({ noServer: true });

    this.wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
      void this.handleWatchConnection(socket, request).catch((err: unknown) => {
        this.logger.warn(`Video watch connection error: ${err instanceof Error ? err.message : String(err)}`);
        socket.close(1008, 'Unauthorized');
      });
    });

    this.upgradeListener = (request: IncomingMessage, socket: Duplex, head: Buffer) => {
      try {
        const host = request.headers.host ?? 'localhost';
        const url = new URL(request.url ?? '/', `http://${host}`);
        if (url.pathname !== WATCH_WS_PATH) {
          return;
        }

        this.wss!.handleUpgrade(request, socket, head, (upgraded: WebSocket) => {
          this.wss!.emit('connection', upgraded, request);
        });
      } catch (e) {
        this.logger.warn(`video watch upgrade failed: ${e instanceof Error ? e.message : String(e)}`);
        socket.destroy();
      }
    };

    httpServer.prependListener('upgrade', this.upgradeListener);
    this.logger.log(`Video watch WebSocket: ${WATCH_WS_PATH}`);
  }

  buildRtmpIngestUrl(streamKey: string): string {
    return `rtmp://${this.config.rtmpPublicHost}:${this.config.rtmpIngestPort}${LOCAL_RTMP_PATH}/${streamKey}`;
  }

  buildLocalRtmpUrl(): string {
    const port = this.config.localRtmpPort;
    return `rtmp://127.0.0.1:${port}${LOCAL_RTMP_PATH}`;
  }

  async registerStream(bridgeTokenId: string, userId: string) {
    await this.repo.endPendingStreamsForBridge(bridgeTokenId);
    const stream = await this.repo.createStream({
      bridgeTokenId,
      userId,
      rtmpIngestUrl: 'pending',
    });

    const rtmpIngestUrl = this.buildRtmpIngestUrl(stream.streamKey);
    await this.repo.updateRtmpIngestUrl(stream.id, rtmpIngestUrl);
    this.allowedStreamKeys.add(stream.streamKey);

    return {
      streamKey: stream.streamKey,
      rtmpIngestUrl,
      localRtmpUrl: `${this.buildLocalRtmpUrl()}`,
      status: 'pending' as const,
    };
  }

  async getStatusForBridge(streamKey: string, bridgeTokenId: string) {
    const stream = await this.repo.findByStreamKey(streamKey);
    if (!stream || stream.bridgeTokenId !== bridgeTokenId) {
      throw new NotFoundException('Stream not found');
    }

    return {
      streamKey: stream.streamKey,
      status: stream.status,
      startedAt: stream.startedAt?.toISOString() ?? null,
      playbackAvailable: stream.status === 'active' && this.runtimeStreams.has(stream.streamKey),
    };
  }

  async getActiveForUser(userId: string) {
    const stream = await this.repo.findActiveByUserId(userId);
    if (!stream) {
      return { streamKey: null, status: 'none', playbackAvailable: false };
    }

    return {
      streamKey: stream.streamKey,
      status: stream.status,
      playbackAvailable: stream.status === 'active' && this.runtimeStreams.has(stream.streamKey),
    };
  }

  async getWatchCredentials(userId: string) {
    const stream = await this.repo.findActiveByUserId(userId);
    if (!stream) {
      return {
        streamKey: null,
        token: null,
        playbackAvailable: false,
      };
    }

    const token = await this.jweService.issueWatchToken(userId, stream.streamKey);

    return {
      streamKey: stream.streamKey,
      token,
      playbackAvailable: stream.status === 'active' && this.runtimeStreams.has(stream.streamKey),
    };
  }

  private startRtmpServer(): void {
    this.nms = new NodeMediaServer({
      rtmp: {
        port: this.config.rtmpIngestPort,
        chunk_size: 60000,
        gop_cache: false,
        ping: 30,
        ping_timeout: 60,
      },
      http: {
        port: 0,
        allow_origin: '*',
      },
    });

    this.nms.on('prePublish', (idOrSession: string | NmsPublishSession, streamPathArg?: string) => {
      const { sessionId, streamPath, reject } = this.normalizePublishEvent(idOrSession, streamPathArg);
      const streamKey = this.extractStreamKey(streamPath);
      if (!streamKey || !this.allowedStreamKeys.has(streamKey)) {
        this.logger.warn(`prePublish rejected (unknown stream key): ${streamPath ?? '(missing path)'}`);
        reject();
        return;
      }

      void this.handlePrePublish(sessionId, streamPath!).catch((err: unknown) => {
        this.logger.warn(`prePublish rejected: ${err instanceof Error ? err.message : String(err)}`);
        reject();
      });
    });

    this.nms.on('donePublish', (idOrSession: string | NmsPublishSession, streamPathArg?: string) => {
      const { streamPath } = this.normalizePublishEvent(idOrSession, streamPathArg);
      void this.handleDonePublish(streamPath ?? '');
    });

    this.nms.run();
  }

  private normalizePublishEvent(
    idOrSession: string | NmsPublishSession,
    streamPathArg?: string,
  ): { sessionId: string; streamPath: string | undefined; reject: () => void } {
    if (typeof idOrSession === 'object' && idOrSession !== null) {
      return {
        sessionId: idOrSession.id,
        streamPath: idOrSession.streamPath,
        reject: () => {
          try {
            idOrSession.close?.();
          } catch {
            // ignore
          }
        },
      };
    }

    const sessionId = String(idOrSession);
    return {
      sessionId,
      streamPath: streamPathArg,
      reject: () => {
        try {
          this.nms?.getSession(sessionId)?.reject?.();
        } catch {
          // ignore
        }
      },
    };
  }

  private extractStreamKey(streamPath: string | undefined | null): string | null {
    if (typeof streamPath !== 'string' || streamPath.length === 0) {
      return null;
    }
    const prefix = `${LOCAL_RTMP_PATH}/`;
    if (!streamPath.startsWith(prefix)) {
      return null;
    }
    const key = streamPath.slice(prefix.length);
    return key.length > 0 ? key : null;
  }

  private async handlePrePublish(_id: string, streamPath: string): Promise<void> {
    const streamKey = this.extractStreamKey(streamPath);
    if (!streamKey) {
      throw new UnauthorizedException('Invalid stream path');
    }

    const dbStream = await this.repo.findByStreamKey(streamKey);
    if (!dbStream || !['pending', 'active'].includes(dbStream.status)) {
      throw new UnauthorizedException('Unknown or inactive stream key');
    }

    if (this.runtimeStreams.has(streamKey)) {
      this.teardownRuntimeStream(streamKey);
    }

    if (!this.worker) {
      throw new Error('MediaSoup worker not ready');
    }

    const router = await this.worker.createRouter({
      mediaCodecs: [
        {
          kind: 'video',
          mimeType: 'video/H264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '42e01f',
            'level-asymmetry-allowed': 1,
          },
        },
      ],
    });

    const rtmpReceivedAt = Date.now();
    const runtime: RuntimeStream = {
      streamKey,
      userId: dbStream.userId,
      dbId: dbStream.id,
      router,
      producer: null,
      plainTransport: null,
      ffmpegProcess: null,
      consumers: new Map(),
      recvTransports: new Map(),
      rtmpReceivedAt,
      producerCreatedAt: null,
    };

    this.runtimeStreams.set(streamKey, runtime);
    await this.repo.updateStatus(dbStream.id, 'active', { startedAt: new Date() });

    this.logger.log(`[video-pipeline] RTMP publish received streamKey=${streamKey} t=${rtmpReceivedAt}`);
    await this.startFfmpegIngest(runtime, streamKey);
    this.logger.log(`RTMP stream active: ${streamKey}`);
  }

  private async handleDonePublish(streamPath: string): Promise<void> {
    const streamKey = this.extractStreamKey(streamPath);
    if (!streamKey) {
      return;
    }

    const runtime = this.runtimeStreams.get(streamKey);
    if (runtime) {
      await this.repo.updateStatus(runtime.dbId, 'ended', { endedAt: new Date() });
      this.teardownRuntimeStream(streamKey);
      this.allowedStreamKeys.delete(streamKey);
      this.logger.log(`RTMP stream ended: ${streamKey}`);
    }
  }

  @Interval(60_000)
  async cleanupIdleStreams(): Promise<void> {
    if (!this.config?.enabled) {
      return;
    }

    const cutoff = Date.now() - this.config.streamIdleTimeoutMs;
    const stale = await this.repo.findStaleStreams(new Date(cutoff));
    for (const stream of stale) {
      this.allowedStreamKeys.delete(stream.streamKey);
      if (this.runtimeStreams.has(stream.streamKey)) {
        this.teardownRuntimeStream(stream.streamKey);
      }
      await this.repo.updateStatus(stream.id, 'ended', { endedAt: new Date() });
      this.logger.log(`Idle stream ended: ${stream.streamKey}`);
    }
  }

  private async startFfmpegIngest(runtime: RuntimeStream, streamKey: string): Promise<void> {
    const plainTransport = await runtime.router.createPlainTransport({
      listenIp: { ip: '127.0.0.1', announcedIp: undefined },
      rtcpMux: false,
      comedia: true,
    });
    runtime.plainTransport = plainTransport;

    const rtpPort = plainTransport.tuple.localPort;
    if (!rtpPort) {
      throw new Error('Plain transport has no local RTP port');
    }

    const rtmpSource = `rtmp://127.0.0.1:${this.config.rtmpIngestPort}${LOCAL_RTMP_PATH}/${streamKey}`;
    const rtpDestination = `rtp://127.0.0.1:${rtpPort}?pkt_size=1200`;

    // Enough probe data to extract H.264 SPS/PPS from the FLV header without
    // adding human-perceptible latency (FFmpeg stops as soon as params are found).
    const inputArgs = [
      '-hide_banner',
      '-loglevel',
      'warning',
      '-thread_queue_size',
      '512',
      '-fflags',
      'nobuffer',
      '-analyzeduration',
      '2000000',
      '-probesize',
      '1048576',
      '-i',
      rtmpSource,
    ];

    const copyOutputArgs = [
      '-map',
      '0:v:0',
      '-an',
      '-c:v',
      'copy',
      '-bsf:v',
      'h264_mp4toannexb',
      '-payload_type',
      '96',
      '-ssrc',
      String(VIDEO_SSRC),
      '-f',
      'rtp',
      rtpDestination,
    ];

    const transcodeOutputArgs = [
      '-map',
      '0:v:0',
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-tune',
      'zerolatency',
      '-profile:v',
      'baseline',
      '-pix_fmt',
      'yuv420p',
      '-g',
      '15',
      '-payload_type',
      '96',
      '-ssrc',
      String(VIDEO_SSRC),
      '-f',
      'rtp',
      rtpDestination,
    ];

    let ffmpeg: ChildProcessWithoutNullStreams;
    let mode: 'copy' | 'transcode';
    try {
      ffmpeg = await this.spawnFfmpegStable(streamKey, [...inputArgs, ...copyOutputArgs], 1500);
      mode = 'copy';
      this.logger.log(`[video-pipeline] H264 copy ingest stable streamKey=${streamKey}`);
    } catch (err) {
      this.logger.warn(
        `H264 copy ingest failed for ${streamKey}, falling back to libx264 transcode: ${err instanceof Error ? err.message : String(err)}`,
      );
      ffmpeg = await this.spawnFfmpegStable(streamKey, [...inputArgs, ...transcodeOutputArgs], 2000);
      mode = 'transcode';
      this.logger.log(`[video-pipeline] libx264 transcode ingest stable streamKey=${streamKey}`);
    }

    runtime.ffmpegProcess = ffmpeg;
    this.attachFfmpegExitHandler(ffmpeg, streamKey);

    runtime.producer = await plainTransport.produce({
      kind: 'video',
      rtpParameters: {
        codecs: [
          {
            mimeType: 'video/H264',
            payloadType: 96,
            clockRate: 90000,
            parameters: {
              'packetization-mode': 1,
              'profile-level-id': '42e01f',
              'level-asymmetry-allowed': 1,
            },
          },
        ],
        encodings: [{ ssrc: VIDEO_SSRC }],
      },
    });
    runtime.producerCreatedAt = Date.now();
    const ingestMs = runtime.producerCreatedAt - runtime.rtmpReceivedAt;
    this.logger.log(
      `[video-pipeline] MediaSoup producer created streamKey=${streamKey} mode=${mode} ingestMs=${ingestMs}`,
    );
  }

  /**
   * Spawns FFmpeg and resolves once it has been running for `stableMs` without
   * exiting. Rejects if FFmpeg exits before that window elapses. Captures
   * stderr to surface the actual failure reason in the rejection error.
   */
  private spawnFfmpegStable(
    streamKey: string,
    args: string[],
    stableMs: number,
  ): Promise<ChildProcessWithoutNullStreams> {
    return new Promise((resolve, reject) => {
      const proc = spawn(ffmpegInstaller.path, args);
      const stderrTail: string[] = [];

      proc.stderr.on('data', (chunk: Buffer) => {
        const line = chunk.toString().trim();
        if (!line) {
          return;
        }
        this.logger.debug(`ffmpeg[${streamKey}]: ${line}`);
        stderrTail.push(line);
        if (stderrTail.length > 8) {
          stderrTail.shift();
        }
      });

      let settled = false;

      const stableTimer = setTimeout(() => {
        if (settled) return;
        settled = true;
        proc.off('exit', onEarlyExit);
        resolve(proc);
      }, stableMs);

      const onEarlyExit = (code: number | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(stableTimer);
        const tail = stderrTail.join(' | ') || '(no stderr output)';
        reject(new Error(`ffmpeg exited early code=${code ?? 'null'}: ${tail}`));
      };

      proc.once('exit', onEarlyExit);
    });
  }

  private attachFfmpegExitHandler(proc: ChildProcessWithoutNullStreams, streamKey: string): void {
    proc.stderr.on('data', (chunk: Buffer) => {
      const line = chunk.toString().trim();
      if (line) {
        this.logger.debug(`ffmpeg[${streamKey}]: ${line}`);
      }
    });
    proc.on('exit', (code) => {
      this.logger.log(`ffmpeg exited for ${streamKey} with code ${code ?? 'null'}`);
    });
  }

  private teardownRuntimeStream(streamKey: string): void {
    const runtime = this.runtimeStreams.get(streamKey);
    if (!runtime) {
      return;
    }

    runtime.ffmpegProcess?.kill('SIGTERM');
    runtime.producer?.close();
    runtime.plainTransport?.close();

    for (const consumer of runtime.consumers.values()) {
      consumer.close();
    }
    for (const transport of runtime.recvTransports.values()) {
      transport.close();
    }

    runtime.router.close();
    this.runtimeStreams.delete(streamKey);
    this.allowedStreamKeys.delete(streamKey);
  }

  private async authenticateWatchRequest(request: IncomingMessage, streamKey: string): Promise<string> {
    const host = request.headers.host ?? 'localhost';
    const url = new URL(request.url ?? '/', `http://${host}`);
    const queryToken = url.searchParams.get('token');
    const authHeader = request.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const token = bearerToken ?? queryToken;

    if (!token) {
      throw new UnauthorizedException('No authorization token provided');
    }

    const payload = await this.jweService.verifyToken(token);
    const userId = payload.id as string;
    const tokenStreamKey = payload.streamKey as string | undefined;

    if (tokenStreamKey && tokenStreamKey !== streamKey) {
      throw new UnauthorizedException('Stream key mismatch');
    }

    const dbStream = await this.repo.findByStreamKey(streamKey);
    if (!dbStream || dbStream.userId !== userId) {
      throw new UnauthorizedException('Stream access denied');
    }

    return userId;
  }

  private async handleWatchConnection(socket: WebSocket, request: IncomingMessage): Promise<void> {
    const host = request.headers.host ?? 'localhost';
    const url = new URL(request.url ?? '/', `http://${host}`);
    const streamKey = url.searchParams.get('streamKey');

    if (!streamKey) {
      socket.close(1008, 'streamKey required');
      return;
    }

    await this.authenticateWatchRequest(request, streamKey);

    const runtime = this.runtimeStreams.get(streamKey);
    if (!runtime?.producer) {
      socket.send(JSON.stringify({ type: 'error', message: 'Stream not active yet' }));
      socket.close(1013, 'Stream not ready');
      return;
    }

    socket.send(
      JSON.stringify({
        type: 'routerRtpCapabilities',
        data: runtime.router.rtpCapabilities,
      }),
    );

    socket.on('message', (raw: RawData) => {
      void this.handleWatchMessage(socket, runtime, raw).catch((err: unknown) => {
        this.logger.warn(`watch message error: ${err instanceof Error ? err.message : String(err)}`);
        socket.send(JSON.stringify({ type: 'error', message: 'Signaling failed' }));
      });
    });
  }

  private async handleWatchMessage(socket: WebSocket, runtime: RuntimeStream, raw: RawData): Promise<void> {
    const msg = JSON.parse(normalizeRawData(raw)) as WatchClientMessage;

    if (msg.type === 'createWebRtcTransport') {
      const transport = await runtime.router.createWebRtcTransport({
        listenIps: [{ ip: this.config.mediasoupListenIp, announcedIp: this.config.mediasoupAnnouncedIp }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      });

      runtime.recvTransports.set(transport.id, transport);

      socket.send(
        JSON.stringify({
          type: 'webRtcTransportCreated',
          data: {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
          },
        }),
      );
      return;
    }

    if (msg.type === 'connectWebRtcTransport' && msg.transportId && msg.dtlsParameters) {
      const transport = runtime.recvTransports.get(msg.transportId);
      if (!transport) {
        socket.send(JSON.stringify({ type: 'error', message: 'Transport not found' }));
        return;
      }

      await transport.connect({ dtlsParameters: msg.dtlsParameters });
      socket.send(JSON.stringify({ type: 'webRtcTransportConnected', transportId: transport.id }));
      return;
    }

    if (msg.type === 'consume' && msg.transportId && msg.rtpCapabilities && runtime.producer) {
      const transport = runtime.recvTransports.get(msg.transportId);
      if (!transport) {
        socket.send(JSON.stringify({ type: 'error', message: 'Transport not found' }));
        return;
      }

      if (!runtime.router.canConsume({ producerId: runtime.producer.id, rtpCapabilities: msg.rtpCapabilities })) {
        socket.send(JSON.stringify({ type: 'error', message: 'Cannot consume stream' }));
        return;
      }

      const consumer = await transport.consume({
        producerId: runtime.producer.id,
        rtpCapabilities: msg.rtpCapabilities,
        paused: true,
      });

      runtime.consumers.set(consumer.id, consumer);

      socket.send(
        JSON.stringify({
          type: 'consumed',
          data: {
            id: consumer.id,
            producerId: runtime.producer.id,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
          },
        }),
      );
      return;
    }

    if (msg.type === 'resumeConsumer' && msg.consumerId) {
      const consumer = runtime.consumers.get(msg.consumerId);
      if (!consumer) {
        socket.send(JSON.stringify({ type: 'error', message: 'Consumer not found' }));
        return;
      }

      await consumer.resume();
      const consumerConnectedAt = Date.now();
      const producerCreatedAt = runtime.producerCreatedAt;
      const rtmpReceivedAt = runtime.rtmpReceivedAt;
      if (producerCreatedAt !== null) {
        this.logger.log(
          `[video-pipeline] WebRTC consumer resumed streamKey=${runtime.streamKey} ` +
            `signalingMs=${consumerConnectedAt - producerCreatedAt} totalMs=${consumerConnectedAt - rtmpReceivedAt}`,
        );
      }
      socket.send(JSON.stringify({ type: 'consumerResumed', consumerId: consumer.id }));
    }
  }
}
