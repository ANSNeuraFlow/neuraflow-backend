import { HttpException } from '@nestjs/common';

export interface BaseHttpExceptionOptions {
  errorCode?: string | number;
  errors?: any;
}

/**
 * Api Exception class
 *
 * @export
 * @class ApiException
 * @extends {HttpException}
 */
export class BaseHttpException extends HttpException {
  extra: BaseHttpExceptionOptions;

  constructor(message: string | Record<string, any>, status = 500, options: BaseHttpExceptionOptions = {}) {
    super(message, status);
    this.extra = options;
  }
}
