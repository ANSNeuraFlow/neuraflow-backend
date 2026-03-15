import { ERROR_CODE } from 'common/errors';

import { BaseWsException } from './base.ws.exception';

export class ValidationFailedWsException extends BaseWsException {
  constructor(errors: any) {
    super('Validation Failed', {
      errorCode: ERROR_CODE.VALIDATION_ERROR,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      errors,
    });
  }
}
