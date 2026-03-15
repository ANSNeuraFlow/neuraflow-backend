export interface BaseDomainExceptionOptions {
  errorCode: string;
  errors?: any;
  additionalInfo?: Record<string, any>;
}

export class BaseDomainException extends Error {
  extra: BaseDomainExceptionOptions;

  constructor(message: string, options: BaseDomainExceptionOptions) {
    super(message);
    this.extra = options;
  }
}
