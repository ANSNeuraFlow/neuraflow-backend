import { applyDecorators } from '@nestjs/common';
import { ResourceConflictHttpException } from 'common/exceptions';

import { TemplatedApiException } from './templated-api-exception.decorator';

export function ApiResourceConflictException() {
  return applyDecorators(
    TemplatedApiException(() => ResourceConflictHttpException, {
      description: 'Resource exists',
    }),
  );
}
