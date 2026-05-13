import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

const BRIDGE_CONTROL_ACTIONS = ['start_streaming', 'stop_streaming'] as const;
export type BridgeControlAction = (typeof BRIDGE_CONTROL_ACTIONS)[number];

export class BridgeControlCommandDto {
  @ApiProperty({ enum: BRIDGE_CONTROL_ACTIONS, example: 'start_streaming' })
  @IsString()
  @IsNotEmpty()
  @IsIn(BRIDGE_CONTROL_ACTIONS)
  action!: BridgeControlAction;
}
