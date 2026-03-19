import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'common/decorators/roles.decorator';
import { RolesGuard } from 'common/guards/roles.guard';
import type { Request } from 'express';

import { AuthGuard } from '../auth/auth.guard';
import { AdminService } from './admin.service';
import { CreateAdminUserDto } from './dtos/create-admin-user.dto';
import { UpdateUserRoleDto } from './dtos/update-user-role.dto';

@ApiTags('Admin — Users')
@ApiBearerAuth()
@Roles('ADMIN')
@UseGuards(AuthGuard, RolesGuard)
@Controller({
  path: 'admin/users',
  version: '1',
})
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a user account (admin only)' })
  async createUser(@Body() dto: CreateAdminUserDto) {
    return this.adminService.createUser(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all users (admin only)' })
  async getUsers() {
    return this.adminService.getUsers();
  }

  @Patch(':id/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user role (admin only)' })
  async updateUserRole(@Param('id') userId: string, @Body() dto: UpdateUserRoleDto) {
    return this.adminService.updateUserRole(userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user (admin only)' })
  async deleteUser(@Param('id') userId: string, @Req() req: Request & { user: { id: string } }) {
    return this.adminService.deleteUser(userId, req.user.id);
  }
}
