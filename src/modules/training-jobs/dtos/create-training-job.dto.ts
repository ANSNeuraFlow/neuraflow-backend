import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class CreateTrainingJobDto {
  @ApiProperty({
    description: 'list of completed session IDs',
    example: ['019xxx-aaa', '019xxx-bbb'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  sessionIds!: string[];
}
