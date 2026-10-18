import { Module } from '@nestjs/common';

import { EmailModule } from '../email/email.module.js';
import { SessionModule } from '../session/session.module.js';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { EMAIL_VERIFICATION_TOKEN_REPOSITORY } from './repositories/email-verification-token-repository.interface.js';
import { PASSWORD_RESET_TOKEN_REPOSITORY } from './repositories/password-reset-token-repository.interface.js';
import { PrismaEmailVerificationTokenRepository } from './repositories/prisma-email-verification-token.repository.js';
import { PrismaPasswordResetTokenRepository } from './repositories/prisma-password-reset-token.repository.js';
import { PrismaUserRepository } from './repositories/prisma-user.repository.js';
import { USER_REPOSITORY } from './repositories/user-repository.interface.js';

@Module({
  imports: [SessionModule, EmailModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    {
      provide: EMAIL_VERIFICATION_TOKEN_REPOSITORY,
      useClass: PrismaEmailVerificationTokenRepository,
    },
    {
      provide: PASSWORD_RESET_TOKEN_REPOSITORY,
      useClass: PrismaPasswordResetTokenRepository,
    },
  ],
})
export class AuthModule {}
