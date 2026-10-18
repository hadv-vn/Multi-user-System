import { Module } from '@nestjs/common';

import { RbacModule } from '../rbac/rbac.module.js';
import { SessionModule } from '../session/session.module.js';

import { AccountController } from './account.controller.js';
import { AccountService } from './account.service.js';
import { ACCOUNT_USER_REPOSITORY } from './repositories/account-user-repository.interface.js';
import { PrismaAccountUserRepository } from './repositories/prisma-account-user.repository.js';

@Module({
  imports: [SessionModule, RbacModule],
  controllers: [AccountController],
  providers: [
    AccountService,
    { provide: ACCOUNT_USER_REPOSITORY, useClass: PrismaAccountUserRepository },
  ],
})
export class AccountModule {}
