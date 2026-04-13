export const WS_EVENT = {
  EXCEPTION: 'exception',
  CLUSTER_METRICS_UPDATE: 'cluster:metrics_update',
  EEG_DATA: 'eeg:data',
  EEG_DISPLAY_DATA: 'eeg:display_data',
  EEG_DISPLAY_LIVE: 'eeg:display_live',
} as const;
export const WS_EVENTS = Object.values(WS_EVENT);
export type WsEvent = (typeof WS_EVENT)[keyof typeof WS_EVENT];
