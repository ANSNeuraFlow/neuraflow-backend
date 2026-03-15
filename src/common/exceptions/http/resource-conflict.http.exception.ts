import { HttpStatus } from '@nestjs/common';
import { ERROR_CODE } from 'common/errors';

import { BaseHttpException } from './base.http.exception';

export class ResourceConflictHttpException extends BaseHttpException {
  constructor() {
    super('Resource already exists', HttpStatus.CONFLICT, {
      errorCode: ERROR_CODE.RESOURCE_CONFLICT_ERROR,
    });
  }
}
