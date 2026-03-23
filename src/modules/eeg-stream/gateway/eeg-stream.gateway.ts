import { Logger, UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { WS_EVENT } from 'common/enums';
import { WsExceptionFilter } from 'common/filters';
import { WsValidationPipe } from 'common/pipes';
import { Server } from 'socket.io';

import { EegPayloadDto } from '../dtos/eeg-payload.dto';
import { EegStreamService } from '../eeg-stream.service';
import type { EegSocket } from '../models/eeg-ws.model';
import { EegWsAuthGuard } from './eeg-ws-auth.guard';

@UseFilters(WsExceptionFilter)
@UseGuards(EegWsAuthGuard)
@WebSocketGateway({
  namespace: '/eeg',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class EegStreamGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EegStreamGateway.name);

  constructor(private readonly eegStreamService: EegStreamService) {}

  afterInit() {
    this.logger.log('EegStreamGateway initialized');
  }

  handleConnection(client: EegSocket) {
    this.logger.log(`Client connected: ${client.id} (user: ${client.data.user?.email ?? 'unknown'})`);
  }

  handleDisconnect(client: EegSocket) {
    this.logger.log(`Client disconnected: ${client.id} (user: ${client.data.user?.email ?? 'unknown'})`);
  }

  @SubscribeMessage(WS_EVENT.EEG_DATA)
  @UsePipes(WsValidationPipe)
  handleEegData(@MessageBody() payload: EegPayloadDto, @ConnectedSocket() client: EegSocket): void {
    const { userId, sessionId } = client.data;

    this.eegStreamService.sendEegSample(userId, sessionId, payload);
  }
}
