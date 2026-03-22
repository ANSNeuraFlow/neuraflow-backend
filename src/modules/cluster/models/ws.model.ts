import type { Socket } from 'socket.io';

import type { ClusterOverviewModel } from './cluster.model';

export interface ServerToClientEvents {
  'cluster:metrics_update': (data: ClusterOverviewModel) => void;
  exception: (error: any) => void;
}

export type ClientToServerEvents = Record<string, never>;

export interface WsUserPayload {
  id: string;
  email: string;
  role: string;
  [key: string]: unknown;
}

export interface WsSocketData {
  user: WsUserPayload;
}

export type AuthenticatedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  WsSocketData
>;
