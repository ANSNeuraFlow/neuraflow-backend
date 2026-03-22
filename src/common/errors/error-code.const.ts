export const ERROR_CODE = {
  UNKNOWN_ERROR: 'unknown_error',
  VALIDATION_ERROR: 'validation_error',
  RESOURCE_CONFLICT_ERROR: 'resource_conflict_error',
  NOT_FOUND_ERROR: 'not_found_error',
  WS_REQUEST_TIMEOUT_ERROR: 'ws_request_timeout_error',
  WS_REQUEST_FAILED_ERROR: 'ws_request_failed_error',
  UNAUTHORIZED_ERROR: 'unauthorized_error',
  FORBIDDEN_ERROR: 'forbidden_error',
} as const;

export const ERROR_CODES = Object.values(ERROR_CODE);

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];
