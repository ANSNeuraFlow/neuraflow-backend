export const WS_EVENT = {
  EXCEPTION: 'exception',
} as const;

export const WS_EVENTS = Object.values(WS_EVENT);

export type WsEvent = (typeof WS_EVENT)[keyof typeof WS_EVENT];
