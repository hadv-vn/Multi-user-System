import { IsIn } from 'class-validator';

import { ROLE_NAME, type RoleName } from '../../rbac/role.constants.js';

export class ChangeRoleDto {
  @IsIn(Object.values(ROLE_NAME))
  role!: RoleName;
}
