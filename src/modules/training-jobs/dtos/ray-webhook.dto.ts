import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { TrainingJobStatus } from 'common/enums';

export class RayWebhookDto {
  @ApiProperty({ example: '019xxx-training-job-id' })
  @IsUUID()
  trainingJobId!: string;

  @ApiProperty({ enum: TrainingJobStatus })
  @IsEnum(TrainingJobStatus)
  status!: TrainingJobStatus;

  @ApiPropertyOptional({ example: '/models/userId/jobId/eegnet.h5' })
  @IsOptional()
  @IsString()
  modelPath?: string;

  @ApiPropertyOptional({ example: 0.923 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  accuracy?: number;

  @ApiPropertyOptional({ example: 'CUDA out of memory' })
  @IsOptional()
  @IsString()
  errorMessage?: string;
}
