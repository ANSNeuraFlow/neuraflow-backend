import { HttpStatus } from '@nestjs/common';
import { ERROR_CODE } from 'common/errors';

import { BaseHttpException } from './base.http.exception';

export class NotFoundHttpException extends BaseHttpException {
  constructor(resource: string | number) {
    super(`${resource} not found`, HttpStatus.NOT_FOUND, {
      errorCode: ERROR_CODE.NOT_FOUND_ERROR,
    });
  }
}
