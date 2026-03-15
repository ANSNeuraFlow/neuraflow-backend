import { ERROR_CODE } from 'common/errors';

import { BaseWsException } from './base.ws.exception';

export class NotFoundWsException extends BaseWsException {
  constructor(resource: string | number) {
    super(`${resource} not found`, {
      errorCode: ERROR_CODE.NOT_FOUND_ERROR,
    });
  }
}
