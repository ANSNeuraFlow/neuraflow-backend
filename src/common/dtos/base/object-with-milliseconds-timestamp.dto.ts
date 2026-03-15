import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class ObjectWithMillisecondsTimestampDto {
  @ApiProperty({ required: true })
  @IsNumber()
  timestamp_milliseconds!: number;
}
