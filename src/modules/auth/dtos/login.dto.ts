import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'jan.kowalski@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SuperPassword123!' })
  @IsString()
  @MinLength(8)
  password!: string;
}
