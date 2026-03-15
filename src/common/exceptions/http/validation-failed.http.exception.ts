import { HttpStatus } from '@nestjs/common';

import { BaseHttpException } from './base.http.exception';
export class ValidationFailedHttpException extends BaseHttpException {
  constructor(errors: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    super('Validation Failed', HttpStatus.BAD_REQUEST, { errors });
  }
}
