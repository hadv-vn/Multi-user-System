import { Module } from '@nestjs/common';

import { RbacModule } from '../rbac/rbac.module.js';
import { SessionModule } from '../session/session.module.js';

import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { ADMIN_ACTION_LOG_REPOSITORY } from './repositories/admin-action-log-repository.interface.js';
import { ADMIN_USER_REPOSITORY } from './repositories/admin-user-repository.interface.js';
import { PrismaAdminActionLogRepository } from './repositories/prisma-admin-action-log.repository.js';
import { PrismaAdminUserRepository } from './repositories/prisma-admin-user.repository.js';

@Module({
  imports: [SessionModule, RbacModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    { provide: ADMIN_USER_REPOSITORY, useClass: PrismaAdminUserRepository },
    { provide: ADMIN_ACTION_LOG_REPOSITORY, useClass: PrismaAdminActionLogRepository },
  ],
})
export class AdminModule {}
