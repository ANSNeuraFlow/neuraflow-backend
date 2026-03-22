import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { WS_EVENT } from 'common/enums';
import { WsExceptionFilter } from 'common/filters';
import { Server } from 'socket.io';

import { ClusterService } from '../cluster.service';
import type { AuthenticatedSocket } from '../models/ws.model';
import { WsAuthGuard } from './ws-auth.guard';

const METRICS_INTERVAL_MS = 5000;

@UseFilters(WsExceptionFilter)
@UseGuards(WsAuthGuard)
@WebSocketGateway({
  namespace: 'cluster',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ClusterGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ClusterGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly clusterService: ClusterService) {}

  afterInit() {
    this.logger.log('ClusterGateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Client connected: ${client.id} (user: ${client.data.user?.email ?? 'unknown'})`);

    try {
      const data = await this.clusterService.getClusterOverview();
      client.emit(WS_EVENT.CLUSTER_METRICS_UPDATE, data);
    } catch (error) {
      this.logger.error(`Failed to send initial metrics to ${client.id}: ${(error as Error).message}`);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id} (user: ${client.data.user?.email ?? 'unknown'})`);
  }

  @Interval(METRICS_INTERVAL_MS)
  async broadcastMetrics() {
    const connectedSockets = await this.server.fetchSockets();
    if (connectedSockets.length === 0) return;

    try {
      const data = await this.clusterService.getClusterOverview();
      this.server.emit(WS_EVENT.CLUSTER_METRICS_UPDATE, data);
      this.logger.debug(`Broadcasted metrics to ${connectedSockets.length} client(s)`);
    } catch (error) {
      this.logger.error(`Failed to broadcast cluster metrics: ${(error as Error).message}`);
    }
  }
}
