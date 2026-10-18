import { Module } from '@nestjs/common';

import { CURRENT_ROLE_READER } from './current-role-reader.interface.js';
import { PrismaCurrentRoleReader } from './prisma-current-role.reader.js';
import { PrismaSessionRepository } from './prisma-session.repository.js';
import { PrismaUserStatusReader } from './prisma-user-status.reader.js';
import { SESSION_REPOSITORY } from './session-repository.interface.js';
import { SessionService } from './session.service.js';
import { USER_STATUS_READER } from './user-status-reader.interface.js';

@Module({
  providers: [
    { provide: SESSION_REPOSITORY, useClass: PrismaSessionRepository },
    { provide: CURRENT_ROLE_READER, useClass: PrismaCurrentRoleReader },
    { provide: USER_STATUS_READER, useClass: PrismaUserStatusReader },
    SessionService,
  ],
  exports: [SessionService],
})
export class SessionModule {}
