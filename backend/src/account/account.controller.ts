import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

import { CsrfCookieIssuerInterceptor } from '../common/csrf/csrf-cookie-issuer.interceptor.js';
import { CsrfGuard } from '../common/csrf/csrf.guard.js';
import { CurrentUser } from '../session/current-user.decorator.js';
import { AuthGuard } from '../session/guards/auth.guard.js';
import type { AuthenticatedUserContext } from '../types/authenticated-user-context.interface.js';

import { AccountProfileResult } from './account-results.interface.js';
import { AccountService } from './account.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { DeactivateAccountDto } from './dto/deactivate-account.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { RejectNonEditableProfileFieldsGuard } from './guards/reject-non-editable-profile-fields.guard.js';

@Controller('api/v1/account')
@UseGuards(AuthGuard)
@UseInterceptors(CsrfCookieIssuerInterceptor)
export class AccountController {
  constructor(
    private readonly accountService: AccountService,
    private readonly configService: ConfigService,
  ) {}

  @Get('me')
  async getMe(
    @CurrentUser() user: AuthenticatedUserContext,
  ): Promise<{ data: AccountProfileResult }> {
    const data = await this.accountService.getMyProfile(user.userId, user.role);
    return { data };
  }

  @Patch('me')
  @UseGuards(CsrfGuard, RejectNonEditableProfileFieldsGuard)
  async updateMe(
    @CurrentUser() user: AuthenticatedUserContext,
    @Body() dto: UpdateProfileDto,
  ): Promise<{ data: Pick<AccountProfileResult, 'id' | 'email' | 'name' | 'role' | 'status'> }> {
    const profile = await this.accountService.updateProfile(user.userId, user.role, dto);
    return {
      data: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        status: profile.status,
      },
    };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  async changePassword(
    @CurrentUser() user: AuthenticatedUserContext,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.accountService.changePassword(user.userId, dto);
    return { message: 'Đổi mật khẩu thành công.' };
  }

  @Post('deactivate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  async deactivate(
    @CurrentUser() user: AuthenticatedUserContext,
    @Body() dto: DeactivateAccountDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.accountService.deactivateAccount(user.userId, dto);
    this.clearSessionCookie(res);
    return { message: 'Tài khoản đã được vô hiệu hóa.' };
  }

  private clearSessionCookie(res: Response): void {
    const cookieName = this.configService.get<string>('SESSION_COOKIE_NAME') ?? 'sid';
    res.clearCookie(cookieName, { path: '/' });
  }
}
