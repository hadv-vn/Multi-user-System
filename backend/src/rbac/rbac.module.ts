import { Module } from '@nestjs/common';

import { RolesGuard } from './guards/roles.guard.js';
import { LastAdminPolicyService } from './last-admin-policy.service.js';

@Module({
  providers: [LastAdminPolicyService, RolesGuard],
  exports: [LastAdminPolicyService, RolesGuard],
})
export class RbacModule {}
