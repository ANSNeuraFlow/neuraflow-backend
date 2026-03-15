import {
  buildPlaceholder,
  buildTemplatedApiExceptionDecorator,
} from '@nanogiants/nestjs-swagger-api-exception-decorator';
import { ERROR_CODE } from 'common/errors';
import { BaseHttpException } from 'common/exceptions';

export const TemplatedApiException = buildTemplatedApiExceptionDecorator(
  {
    message: '$message',
    statusCode: '$status',
    errorCode: '$errorCode',
    error: '$error',
    errors: '$errors',
  },
  {
    requiredProperties: ['statusCode', 'message', 'error'],
    placeholders: {
      errors: buildPlaceholder(
        () => BaseHttpException,
        (exception): any => exception.extra.errors || {},
      ),
      errorCode: buildPlaceholder(
        () => BaseHttpException,
        (exception) => exception.extra.errorCode || ERROR_CODE.UNKNOWN_ERROR,
      ),
      error: buildPlaceholder(
        () => BaseHttpException,
        (exception) => exception.name,
      ),
      message: buildPlaceholder(
        () => BaseHttpException,
        (exception) => exception.message,
      ),
    },
  },
);
