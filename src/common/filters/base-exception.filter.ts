import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';

import { BaseHttpException } from '../exceptions';

@Catch(BaseHttpException)
export class BaseExceptionsFilter implements ExceptionFilter {
  catch(exception: BaseHttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const message = exception.message;
    const options = exception.extra;
    const error = exception.name;

    response.status(status).json({
      statusCode: status,
      message,
      error,
      errorCode: options.errorCode,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      errors: options.errors,
    });
  }
}
