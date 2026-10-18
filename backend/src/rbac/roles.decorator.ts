import { SetMetadata } from '@nestjs/common';

import { RoleName } from './role.constants.js';

export const ROLES_METADATA_KEY = 'roles';

/** Gắn metadata role yêu cầu lên route — đọc bởi RolesGuard. */
export const Roles = (...roles: RoleName[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_METADATA_KEY, roles);
