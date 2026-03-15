import type { BaseWsResponseDto } from 'common/dtos';

import { ERROR_CODE } from '../../errors';
import { BaseDomainException } from './base.domain.exception';

export class WsRequestFailureDomainException<T extends BaseWsResponseDto> extends BaseDomainException {
  public responseData: T;

  constructor(responseData: T) {
    super(`WebSocket Request failed, message: ${responseData.message}`, {
      errorCode: ERROR_CODE.WS_REQUEST_FAILED_ERROR,
    });

    this.responseData = responseData;
  }
}
