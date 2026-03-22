import { ApiProperty } from '@nestjs/swagger';

export class CpuDto {
  @ApiProperty({ example: 42.5, nullable: true })
  usagePercent!: number | null;
}

export class MemoryDto {
  @ApiProperty({ example: 8589934592, nullable: true })
  usedBytes!: number | null;

  @ApiProperty({ example: 17179869184, nullable: true })
  totalBytes!: number | null;

  @ApiProperty({ example: 50.0, nullable: true })
  usedPercent!: number | null;
}

export class DiskDto {
  @ApiProperty({ example: 107374182400, nullable: true })
  usedBytes!: number | null;

  @ApiProperty({ example: 214748364800, nullable: true })
  totalBytes!: number | null;

  @ApiProperty({ example: 50.0, nullable: true })
  usedPercent!: number | null;
}

export class ClusterNodeResponseDto {
  @ApiProperty({ example: 'master' })
  id!: string;

  @ApiProperty({ example: '10.200.40.10' })
  address!: string;

  @ApiProperty({ enum: ['master', 'worker'], example: 'master' })
  role!: 'master' | 'worker';

  @ApiProperty({ example: true })
  isOnline!: boolean;

  @ApiProperty({ type: CpuDto })
  cpu!: CpuDto;

  @ApiProperty({ type: MemoryDto })
  memory!: MemoryDto;

  @ApiProperty({ type: DiskDto })
  disk!: DiskDto;
}

export class ClusterSummaryResponseDto {
  @ApiProperty({ example: 5 })
  totalNodes!: number;

  @ApiProperty({ example: 4 })
  onlineNodes!: number;

  @ApiProperty({ example: 1 })
  offlineNodes!: number;

  @ApiProperty({ type: CpuDto })
  cpu!: CpuDto;

  @ApiProperty({ type: MemoryDto })
  memory!: MemoryDto;

  @ApiProperty({ type: DiskDto })
  disk!: DiskDto;
}

export class ClusterOverviewResponseDto {
  @ApiProperty({ type: [ClusterNodeResponseDto] })
  nodes!: ClusterNodeResponseDto[];

  @ApiProperty({ type: ClusterSummaryResponseDto })
  summary!: ClusterSummaryResponseDto;

  @ApiProperty({ example: '2026-03-20T10:00:00.000Z' })
  fetchedAt!: string;
}
