import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { CsrfCookieIssuerInterceptor } from '../common/csrf/csrf-cookie-issuer.interceptor.js';
import { CsrfGuard } from '../common/csrf/csrf.guard.js';
import { RolesGuard } from '../rbac/guards/roles.guard.js';
import { ROLE_NAME } from '../rbac/role.constants.js';
import { Roles } from '../rbac/roles.decorator.js';
import { CurrentUser } from '../session/current-user.decorator.js';
import { AuthGuard } from '../session/guards/auth.guard.js';
import type { AuthenticatedUserContext } from '../types/authenticated-user-context.interface.js';

import { AdminRoleChangeResult, AdminUserStatusResult } from './admin-results.interface.js';
import { AdminService } from './admin.service.js';
import { ChangeRoleDto } from './dto/change-role.dto.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';

@Controller('api/v1/admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(ROLE_NAME.ADMIN)
@UseInterceptors(CsrfCookieIssuerInterceptor)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async listUsers(@Query() query: ListUsersQueryDto) {
    const result = await this.adminService.listUsers(query);
    return { data: result.items, meta: result.meta };
  }

  @Post('users/:id/lock')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  async lockUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUserContext,
  ): Promise<{ data: AdminUserStatusResult; message: string }> {
    const data = await this.adminService.lockUser(id, actor.userId);
    return {
      data,
      message: 'Tài khoản đã bị khóa. Mọi phiên đăng nhập hiện tại đã bị thu hồi.',
    };
  }

  @Post('users/:id/unlock')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  async unlockUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUserContext,
  ): Promise<{ data: AdminUserStatusResult; message: string }> {
    const data = await this.adminService.unlockUser(id, actor.userId);
    return { data, message: 'Tài khoản đã được mở khóa.' };
  }

  @Patch('users/:id/role')
  @UseGuards(CsrfGuard)
  async changeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser() actor: AuthenticatedUserContext,
  ): Promise<{ data: AdminRoleChangeResult }> {
    const data = await this.adminService.changeRole(id, dto.role, actor.userId);
    return { data };
  }
}
