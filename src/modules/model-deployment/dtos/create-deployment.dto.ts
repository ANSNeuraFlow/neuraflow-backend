import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateDeploymentDto {
  @ApiProperty({ description: 'ID modelu do wdrożenia', format: 'uuid' })
  @IsUUID('all')
  modelId!: string;
}
