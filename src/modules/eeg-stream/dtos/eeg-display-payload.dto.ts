import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';

import { EegPayloadDto } from './eeg-payload.dto';

export class EegDisplayPayloadDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EegPayloadDto)
  data!: EegPayloadDto[];
}
