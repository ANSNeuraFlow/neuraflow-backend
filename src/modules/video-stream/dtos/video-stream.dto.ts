import { ApiProperty } from '@nestjs/swagger';

export class VideoStreamRegisterResponseDto {
  @ApiProperty()
  streamKey!: string;

  @ApiProperty()
  rtmpIngestUrl!: string;

  @ApiProperty()
  localRtmpUrl!: string;

  @ApiProperty()
  status!: string;
}

export class VideoStreamStatusResponseDto {
  @ApiProperty()
  streamKey!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true })
  startedAt!: string | null;

  @ApiProperty()
  playbackAvailable!: boolean;
}

export class VideoStreamActiveResponseDto {
  @ApiProperty({ nullable: true })
  streamKey!: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  playbackAvailable!: boolean;
}

export class VideoStreamWatchCredentialsResponseDto {
  @ApiProperty({ nullable: true })
  streamKey!: string | null;

  @ApiProperty({ nullable: true })
  token!: string | null;

  @ApiProperty()
  playbackAvailable!: boolean;
}
