import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import { IS_PRODUCTION } from '../common/config/is-production.js';
import { CurrentUser } from '../session/current-user.decorator.js';
import { AuthGuard } from '../session/guards/auth.guard.js';
import type { AuthenticatedUserContext } from '../types/authenticated-user-context.interface.js';

import { LoginResult, RegisteredUserResult, VerifyEmailResult } from './auth-results.interface.js';
import { AuthService } from './auth.service.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';

const SESSION_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày (C-7)

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
  ): Promise<{ data: RegisteredUserResult; message: string }> {
    const data = await this.authService.register(dto, this.resolveClientIp(req));
    return {
      data,
      message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
    };
  }

  @Get('verify-email')
  async verifyEmail(
    @Query() dto: VerifyEmailDto,
    @Req() req: Request,
  ): Promise<{ data: VerifyEmailResult }> {
    const data = await this.authService.verifyEmail(dto.token, this.resolveClientIp(req));
    return { data };
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(
    @Body() dto: ResendVerificationDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    await this.authService.resendVerification(dto, this.resolveClientIp(req));
    return {
      message: 'Nếu email tồn tại và chưa được xác thực, một email xác thực mới đã được gửi.',
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: LoginResult }> {
    const result = await this.authService.login(dto, this.resolveClientIp(req));
    this.setSessionCookie(res, result.session.id);
    return { data: result };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    await this.authService.forgotPassword(dto, this.resolveClientIp(req));
    return { message: 'Nếu email tồn tại trong hệ thống, một email đặt lại mật khẩu đã được gửi.' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(dto, this.resolveClientIp(req));
    return { message: 'Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập lại.' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async logout(
    @CurrentUser() user: AuthenticatedUserContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.authService.logout(user.sessionId);
    this.clearSessionCookie(res);
    return { message: 'Đã đăng xuất.' };
  }

  private setSessionCookie(res: Response, sessionId: string): void {
    const cookieName = this.configService.get<string>('SESSION_COOKIE_NAME') ?? 'sid';
    const sameSite = this.configService.get<string>('SESSION_COOKIE_SAME_SITE') ?? 'lax';
    res.cookie(cookieName, sessionId, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: sameSite as 'lax' | 'strict' | 'none',
      path: '/',
      maxAge: SESSION_COOKIE_MAX_AGE_MS,
    });
  }

  private clearSessionCookie(res: Response): void {
    const cookieName = this.configService.get<string>('SESSION_COOKIE_NAME') ?? 'sid';
    res.clearCookie(cookieName, { path: '/' });
  }

  private resolveClientIp(req: Request): string {
    return req.ip ?? 'unknown';
  }
}
