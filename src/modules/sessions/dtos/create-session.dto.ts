import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({ example: 'OpenBCI Cyton' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  deviceName!: string;

  @ApiProperty({ example: 'Alpha-Wave Protocol' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  protocolName!: string;
}
