import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { AccountModule } from './account/account.module.js';
import { AdminModule } from './admin/admin.module.js';
import { AppController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { CommonModule } from './common/common.module.js';
import { validateEnvironment } from './common/config/validate-environment.js';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { RbacModule } from './rbac/rbac.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    ScheduleModule.forRoot(),
    PrismaModule,
    CommonModule,
    AuthModule,
    RbacModule,
    AccountModule,
    AdminModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
