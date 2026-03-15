import { WsException } from '@nestjs/websockets';

export interface BaseWsExceptionOptions {
  errorCode: string;
  errors?: any;
  controllerResponse?: unknown;
  additionalInfo?: Record<string, any>;
}

export class BaseWsException extends WsException {
  constructor(message: string, options: BaseWsExceptionOptions) {
    super({
      message,
      errorCode: options.errorCode,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      ...(options.errors !== undefined && { errors: options.errors }),
      ...(options.controllerResponse !== undefined && {
        controllerResponse: options.controllerResponse,
      }),
      ...(options.additionalInfo !== undefined && { additionalInfo: options.additionalInfo }),
    });
  }
}
