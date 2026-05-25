import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional } from 'class-validator';
import { EegMarker } from 'common/enums';

export class EegPayloadDto {
  @ApiProperty({
    description: 'LSL / device-side timestamp (seconds, wall-clock or monotonic)',
    example: 1777455134.32,
  })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Type(() => Number)
  lsl_ts!: number;

  @ApiProperty({
    description: 'Backend receive timestamp (Unix seconds)',
    example: 1777455134.325,
  })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Type(() => Number)
  recv_ts!: number;

  @ApiProperty({ example: -33584.23 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Type(() => Number)
  ch1!: number;

  @ApiProperty({ example: -32945.04 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Type(() => Number)
  ch2!: number;

  @ApiProperty({ example: -34128.97 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Type(() => Number)
  ch3!: number;

  @ApiProperty({ example: -33882.36 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Type(() => Number)
  ch4!: number;

  @ApiProperty({ example: 0.0 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Type(() => Number)
  ch5!: number;

  @ApiProperty({ example: 0.0 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Type(() => Number)
  ch6!: number;

  @ApiProperty({ example: 0.0 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Type(() => Number)
  ch7!: number;

  @ApiProperty({ example: 0.0 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Type(() => Number)
  ch8!: number;

  @ApiPropertyOptional({
    description: 'Etykieta intencji (marker klasy) dołączona do pakietu EEG',
    enum: EegMarker,
    example: EegMarker.LEFT_HAND,
  })
  @IsOptional()
  @IsEnum(EegMarker)
  marker?: EegMarker;

  @ApiPropertyOptional({
    description: 'Numer próby w sesji (od 1)',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  trial_index?: number | null;
}
