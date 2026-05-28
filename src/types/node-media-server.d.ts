declare module 'node-media-server' {
  import type { EventEmitter } from 'node:events';

  export interface NodeMediaServerConfig {
    rtmp?: {
      port?: number;
      chunk_size?: number;
      gop_cache?: boolean;
      ping?: number;
      ping_timeout?: number;
    };
    http?: {
      port?: number;
      allow_origin?: string;
    };
  }

  export interface NodeMediaSession {
    reject?: () => void;
    close?: () => void;
  }

  export default class NodeMediaServer extends EventEmitter {
    constructor(config: NodeMediaServerConfig);
    run(): void;
    stop(): void;
    getSession(id: string): NodeMediaSession | undefined;
  }
}
