import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { EegMarker } from 'common/enums';

export class EegPayloadDto {
  @ApiProperty({ example: 1711234567890 })
  @IsNumber()
  @Type(() => Number)
  timestamp!: number;

  @ApiProperty({ example: 0.00123 })
  @IsNumber()
  @Type(() => Number)
  ch1!: number;

  @ApiProperty({ example: 0.00456 })
  @IsNumber()
  @Type(() => Number)
  ch2!: number;

  @ApiProperty({ example: 0.00789 })
  @IsNumber()
  @Type(() => Number)
  ch3!: number;

  @ApiProperty({ example: 0.00321 })
  @IsNumber()
  @Type(() => Number)
  ch4!: number;

  @ApiProperty({ example: 0.00654 })
  @IsNumber()
  @Type(() => Number)
  ch5!: number;

  @ApiProperty({ example: 0.00987 })
  @IsNumber()
  @Type(() => Number)
  ch6!: number;

  @ApiProperty({ example: 0.00111 })
  @IsNumber()
  @Type(() => Number)
  ch7!: number;

  @ApiProperty({ example: 0.00222 })
  @IsNumber()
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
}
