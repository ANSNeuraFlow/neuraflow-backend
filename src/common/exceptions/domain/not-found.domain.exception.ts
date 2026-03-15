import { ERROR_CODE } from 'common/errors';

import { BaseDomainException } from './base.domain.exception';

export class NotFoundDomainException extends BaseDomainException {
  readonly resource: string | number;

  constructor(resource: string | number) {
    super(`${resource} not found`, {
      errorCode: ERROR_CODE.NOT_FOUND_ERROR,
    });

    this.resource = resource;
  }
}
