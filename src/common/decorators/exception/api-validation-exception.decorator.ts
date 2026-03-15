import { applyDecorators } from '@nestjs/common';
import { ValidationFailedHttpException } from 'common/exceptions';

import { TemplatedApiException } from './templated-api-exception.decorator';

export function ApiValidationException() {
  return applyDecorators(
    TemplatedApiException(() => new ValidationFailedHttpException([]), {
      description: 'Validation Failed',
    }),
  );
}
