import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class BridgeMarkerDto {
  @ApiProperty({ example: 'LEFT_HAND' })
  @IsString()
  @IsNotEmpty()
  marker!: string;
}
