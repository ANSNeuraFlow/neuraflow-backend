import { ERROR_CODE } from 'common/errors';

import { BaseWsException } from './base.ws.exception';

export class UnknownErrorWsException extends BaseWsException {
  constructor() {
    super('Unknown error occured', {
      errorCode: ERROR_CODE.UNKNOWN_ERROR,
    });
  }
}
