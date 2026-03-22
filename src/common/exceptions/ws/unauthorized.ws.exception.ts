import { ERROR_CODE } from 'common/errors';

import { BaseWsException } from './base.ws.exception';

export class UnauthorizedWsException extends BaseWsException {
  constructor(message = 'Unauthorized') {
    super(message, {
      errorCode: ERROR_CODE.UNAUTHORIZED_ERROR,
    });
  }
}
