import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

export class BridgeAuthStartDto {
  @ApiProperty({ example: 'cyton_bridge' })
  @IsString()
  @MaxLength(64)
  clientId!: string;

  @ApiProperty({ example: 'http://localhost:37421/callback' })
  @IsString()
  @MaxLength(512)
  @Matches(/^http:\/\/localhost:\d{1,5}\/callback$/, {
    message: 'redirectUri must match http://localhost:<port>/callback',
  })
  redirectUri!: string;

  @ApiProperty({ example: 'random-state-string' })
  @IsString()
  @MaxLength(256)
  state!: string;
}
