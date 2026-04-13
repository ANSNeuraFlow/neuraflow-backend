import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({ example: 'Morning calibration run' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  sessionName!: string;

  @ApiProperty({ example: 'Alpha-Wave Protocol' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  protocolName!: string;
}
