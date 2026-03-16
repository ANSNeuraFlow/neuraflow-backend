import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'jan.kowalski@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SuperPassword123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

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
}
