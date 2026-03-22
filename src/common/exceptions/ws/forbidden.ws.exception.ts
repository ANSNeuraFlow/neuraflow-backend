import { ERROR_CODE } from 'common/errors';

import { BaseWsException } from './base.ws.exception';

export class ForbiddenWsException extends BaseWsException {
  constructor(message = 'Forbidden') {
    super(message, {
      errorCode: ERROR_CODE.FORBIDDEN_ERROR,
    });
  }
}
