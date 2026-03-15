import { applyDecorators } from '@nestjs/common';
import { NotFoundHttpException } from 'common/exceptions';

import { TemplatedApiException } from './templated-api-exception.decorator';

export function ApiNotFoundException(resouce?: string | number) {
  return applyDecorators(
    TemplatedApiException(() => new NotFoundHttpException(resouce || 'resouce'), {
      description: 'Resource not found',
    }),
  );
}
