import { applyDecorators } from '@nestjs/common';
import { UnknownErrorHttpException } from 'common/exceptions';

import { TemplatedApiException } from './templated-api-exception.decorator';

export function ApiUnknownErrorException() {
  return applyDecorators(
    TemplatedApiException(() => new UnknownErrorHttpException(), {
      description: 'Internal Server Error',
    }),
  );
}
