import { HttpStatus } from '@nestjs/common';
import { ERROR_CODE } from 'common/errors';

import { BaseHttpException } from './base.http.exception';

export class ForbiddenHttpException extends BaseHttpException {
  constructor(message = 'Forbidden') {
    super(message, HttpStatus.FORBIDDEN, {
      errorCode: ERROR_CODE.FORBIDDEN_ERROR,
    });
  }
}
