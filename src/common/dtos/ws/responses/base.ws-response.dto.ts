import { ApiProperty } from '@nestjs/swagger';
import { Expose, plainToInstance } from 'class-transformer';
import { IsBoolean, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { ERROR_CODE, ERROR_CODES, type ErrorCode } from 'common/errors';

export class BaseWsResponseDto {
  static fromPlain(plain: BaseWsResponseDto): BaseWsResponseDto {
    return plainToInstance(BaseWsResponseDto, plain, {
      excludeExtraneousValues: true,
    });
  }

  @Expose()
  @ApiProperty({ required: true })
  @IsBoolean()
  @IsNotEmpty()
  success!: boolean;

  @Expose()
  @ApiProperty({ required: false, enum: ERROR_CODES })
  @IsEnum(ERROR_CODE)
  @IsOptional()
  errorCode?: ErrorCode;

  @Expose()
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  message?: string;

  @Expose()
  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  data?: unknown;
}
