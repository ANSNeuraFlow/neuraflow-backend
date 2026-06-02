import { EegMarker } from 'common/enums';

export const BCI_CLASS_MARKERS = new Set<string>([
  EegMarker.LEFT_HAND,
  EegMarker.RIGHT_HAND,
  EegMarker.BOTH_HANDS,
  EegMarker.FEET,
]);

export const SSVEP_CLASS_MARKERS = new Set<string>([
  EegMarker.SSVEP_9HZ,
  EegMarker.SSVEP_11HZ,
  EegMarker.SSVEP_13HZ,
  EegMarker.SSVEP_15HZ,
]);

export const MARKER_CLEAR = new Set<string>([
  'IDLE',
  'SESSION_START',
  'SESSION_ABORTED',
  'ABORTED',
  EegMarker.SSVEP_IDLE,
]);

export const MARKER_SESSION_END = new Set<string>(['SESSION_END']);

export const MARKER_REST = new Set<string>([EegMarker.REST]);

export interface EegMarkerState {
  activeMarker: EegMarker | null;
  activeTrialIndex: number | null;
  classTrialCounter: number;
}

export function createEegMarkerState(): EegMarkerState {
  return {
    activeMarker: null,
    activeTrialIndex: null,
    classTrialCounter: 0,
  };
}

export function applyMarkerToState(state: EegMarkerState, marker: string): boolean {
  if (MARKER_CLEAR.has(marker)) {
    state.activeMarker = null;
    state.activeTrialIndex = null;
    return true;
  }

  if (MARKER_SESSION_END.has(marker)) {
    state.activeMarker = null;
    state.activeTrialIndex = null;
    return true;
  }

  if (BCI_CLASS_MARKERS.has(marker) || SSVEP_CLASS_MARKERS.has(marker)) {
    state.classTrialCounter += 1;
    state.activeMarker = marker as EegMarker;
    state.activeTrialIndex = state.classTrialCounter;
    return true;
  }

  if (MARKER_REST.has(marker)) {
    state.activeMarker = EegMarker.REST;
    state.activeTrialIndex = null;
    return true;
  }

  return false;
}

export function isClassMarker(marker: EegMarker | null): boolean {
  return marker !== null && (BCI_CLASS_MARKERS.has(marker) || SSVEP_CLASS_MARKERS.has(marker));
}
