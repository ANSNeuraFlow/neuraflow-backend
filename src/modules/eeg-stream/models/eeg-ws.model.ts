import type { Socket } from 'socket.io';

import type { WsUserPayload } from '../../cluster/models/ws.model';

export interface EegSocketData {
  userId: string;
  sessionId: string;
  user: WsUserPayload;
}

export type EegSocket = Socket<Record<string, never>, Record<string, never>, Record<string, never>, EegSocketData>;
