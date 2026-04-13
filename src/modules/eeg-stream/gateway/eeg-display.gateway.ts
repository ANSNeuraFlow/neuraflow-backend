import { Logger, UseFilters, UseGuards } from '@nestjs/common';
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
import { Server, Socket } from 'socket.io';

import { EegDisplayPayloadDto } from '../dtos/eeg-display-payload.dto';
import { EegDisplayAuthGuard } from './eeg-display-auth.guard';

const BROADCAST_ROOM = 'eeg-live-viewers';

@UseFilters(WsExceptionFilter)
@UseGuards(EegDisplayAuthGuard)
@WebSocketGateway({
  namespace: '/eeg-display',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class EegDisplayGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EegDisplayGateway.name);
  private producerSocketId: string | null = null;

  afterInit() {
    this.logger.log('Gateway 250Hz zainicjalizowany na namespace /eeg-display');
  }

  handleConnection(client: Socket) {
    const role = (client.handshake.query['role'] as string) ?? 'viewer';

    if (role === 'producer') {
      this.producerSocketId = client.id;
      this.logger.log(`BCI Transmitter (producer) connected: ${client.id}`);
    } else {
      void client.join(BROADCAST_ROOM);
      this.logger.log(`Frontend Viewer connected: ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    if (client.id === this.producerSocketId) {
      this.producerSocketId = null;
      this.logger.log('BCI Transmitter disconnected');
    }
  }

  @SubscribeMessage(WS_EVENT.EEG_DISPLAY_DATA)
  handleDisplayData(
    @MessageBody(WsValidationPipe) payload: EegDisplayPayloadDto,
    @ConnectedSocket() _client: Socket,
  ): void {
    this.server.to(BROADCAST_ROOM).emit(WS_EVENT.EEG_DISPLAY_LIVE, payload.data);
  }
}
