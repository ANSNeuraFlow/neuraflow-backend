import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class BridgeAuthTokenDto {
  @ApiProperty({ example: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' })
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  code!: string;

  @ApiProperty({ example: 'cyton_bridge' })
  @IsString()
  @MaxLength(64)
  clientId!: string;
}
