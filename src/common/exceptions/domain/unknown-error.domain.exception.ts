import { ERROR_CODE } from 'common/errors';

import { BaseDomainException } from './base.domain.exception';

export class UnknownErrorDomainException extends BaseDomainException {
  constructor() {
    super(`Unknown error occurred`, {
      errorCode: ERROR_CODE.UNKNOWN_ERROR,
    });
  }
}
