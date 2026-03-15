import { ArgumentMetadata, Injectable, PipeTransform, Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidationFailedWsException } from 'common/exceptions';

@Injectable()
export class WsValidationPipe implements PipeTransform {
  async transform(value: any, { metatype }: ArgumentMetadata): Promise<any> {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    let parsedValue: unknown = value;

    if (typeof value === 'string') {
      try {
        parsedValue = JSON.parse(value);
      } catch {
        throw new ValidationFailedWsException('Invalid JSON string received.');
      }
    }

    const object = plainToInstance<unknown, any>(metatype, parsedValue);
    const errors = await validate(object as object);

    if (errors.length > 0) {
      console.error('Validation failed:', errors);
      throw new ValidationFailedWsException(errors);
    }

    return object;
  }

  private toValidate(metatype: Type<any>): boolean {
    const types: Type<any>[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
