import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'common/decorators/public.decorator';
import type { Request, Response } from 'express';
import { ForceChangePasswordDto } from 'modules/auth/dtos/force-change-password.dto';
import { LoginDto } from 'modules/auth/dtos/login.dto';
import { RegisterDto } from 'modules/auth/dtos/register.dto';

import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in a user' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  async me(@Req() req: Request & { user: { id: string } }) {
    return this.authService.getMe(req.user.id);
  }

  @Public()
  @Post('force-change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force password change on first login' })
  async forceChangePassword(@Body() dto: ForceChangePasswordDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.forceChangePassword(dto, res);
  }
  @UseGuards(AuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log out the current user' })
  logout(@Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res);
  }
}
