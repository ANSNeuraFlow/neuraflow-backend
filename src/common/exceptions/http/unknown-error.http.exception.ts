import { HttpStatus } from '@nestjs/common';
import { ERROR_CODE } from 'common/errors';

import { BaseHttpException } from './base.http.exception';

export class UnknownErrorHttpException extends BaseHttpException {
  constructor() {
    super('Unknown error occured', HttpStatus.INTERNAL_SERVER_ERROR, {
      errorCode: ERROR_CODE.UNKNOWN_ERROR,
    });
  }
}
