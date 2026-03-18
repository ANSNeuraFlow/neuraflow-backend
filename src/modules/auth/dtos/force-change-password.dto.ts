import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class ForceChangePasswordDto {
  @ApiProperty({ example: 'jan.kowalski@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Temporary password set by admin' })
  @IsString()
  temporaryPassword!: string;

  @ApiProperty({ example: 'NewPassword123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
