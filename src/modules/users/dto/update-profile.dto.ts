import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Jan', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Kowalski', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  lastName?: string;

  @ApiPropertyOptional({ example: 'Neuro researcher.', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({ example: '+48 123 456 789', maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phoneNumber?: string;

  @ApiPropertyOptional({ example: '1995-03-15', description: 'ISO 8601 date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}
