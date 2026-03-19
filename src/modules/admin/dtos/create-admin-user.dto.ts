import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAdminUserDto {
  @ApiProperty({ example: 'jan.kowalski@neuraflow.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'StartoweHaslo123!',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  temporaryPassword!: string;

  @ApiProperty({ example: 'Jan' })
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  firstName!: string;

  @ApiProperty({ example: 'Kowalski' })
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  lastName!: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  roleId?: number;
}
