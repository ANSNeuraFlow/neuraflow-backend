import { ERROR_CODE } from '../../errors';
import { BaseDomainException } from './base.domain.exception';

export class WsRequestTimeoutDomainException extends BaseDomainException {
  constructor(timeoutMs: number) {
    super(`WebSocket Request failed after ${timeoutMs}ms timeout`, {
      errorCode: ERROR_CODE.WS_REQUEST_TIMEOUT_ERROR,
    });
  }
}
