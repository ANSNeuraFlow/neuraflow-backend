import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDeviceDto {
  @ApiProperty({ example: 'Cyton Bridge' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  deviceName!: string;

  @ApiProperty({ example: 'linux', enum: ['linux', 'windows', 'macos'] })
  @IsString()
  @IsIn(['linux', 'windows', 'macos'])
  platform!: string;

  @ApiProperty({ example: '1.0.0' })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  version!: string;
}
